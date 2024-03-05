"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat , lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([50 , 30] , 5 , 20 , 174)
// const cycling1 = new Cycling([55 , 45] , 9 , 10 , 317)

////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #editing = false;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener(
      "click",
      this._handleClickOnContainerWorkouts.bind(this)
    );
  }
  _hideElement(el) {
    el.classList.add("hidden");
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Couldn't get your location");
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";
    // Hide form
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 2);
  }

  _toggleElevationField() {
    this._setFormTypeTo(inputType.value);
  }
  _setFormTypeTo(type) {
    inputType.value = type;
    if (type === "running") {
      inputElevation.closest(".form__row").classList.add("form__row--hidden");
      inputCadence.closest(".form__row").classList.remove("form__row--hidden");
    }
    if (type === "cycling") {
      inputElevation
        .closest(".form__row")
        .classList.remove("form__row--hidden");
      inputCadence.closest(".form__row").classList.add("form__row--hidden");
    }
  }
  _newWorkout(e) {
    // Helper functions

    // This one checks if all the inputs are finite
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    // This one checks if all the inputs are positive
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // Prevent default behavior
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    // If workout running, create running workout
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Chack if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive nubmers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling workout
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      // Chack if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive nubmers!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to the workout array
    if(this.#editing){
      const editingWorkoutIndex = this.#workouts.indexOf("editing");
      this.#workouts[editingWorkoutIndex] = workout;
    }else{
    this.#workouts.push(workout);
    }
    // Render workout on the map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);
    // Hide form + clear fields
    this._hideForm();
    // set editing to false
    this.#editing = false;
    
    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _setWorkoutToEditing(workout) {
    const workoutIndex = this.#workouts.indexOf(workout);
    this.#workouts[workoutIndex] = "editing";
    
  }
  _renderWorkoutMarker(workout) {
    const workoutIndex = this.#workouts.indexOf(workout);
    if(this.#editing){ 
      this.#map.removeLayer(this.#markers[workoutIndex]);
    }
 
     this.#markers[workoutIndex]=  L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          content: `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${
            workout.description
          }`,
        })
      )
      .openPopup();


  }
  _findWorkoutObj(workoutEl) {
    return this.#workouts.find(
      (workout) => workout.id === workoutEl.dataset.id
    );
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <button class="workout__edit">
    edit 📝
    </button>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === "running") {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
      `;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li> 
      `;
    }

    form.insertAdjacentHTML("afterend", html);
  }
  _handleClickOnContainerWorkouts(e) {
    const target = e.target;
    const workoutEl = target.closest(".workout");
    if (!workoutEl) return;
    if (target.classList.contains("workout__edit") ) {
      this._eidtWorkout(workoutEl);
      return;
    }
    this._moveToPopup(workoutEl);
  }
  _eidtWorkout(workoutEl) {
    if(this.#editing) 
    {
      alert("You're editing another wokrout")
    return;
    }
    this.#editing = true;
    this._hideElement(workoutEl);

    const workout = this._findWorkoutObj(workoutEl);
    // Delete workout from workouts array
    this._setWorkoutToEditing(workout);
    // Show form

    form.classList.remove("hidden");
    // Put workouts data into form
    this._setFormTypeTo(workout.type);
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === "running") {
      inputCadence.value = workout.cadence;
    }
    if (workout.type === "cycling") {
      inputElevation.value = workout.elevationGain;
    }
    this.#mapEvent = {
      latlng: { lat: workout.coords[0], lng: workout.coords[1] },
    };
  }
  _moveToPopup(workoutEl) {
    const workout = this._findWorkoutObj(workoutEl);
    this.#map.setView(workout.coords, this.#mapZoomLevel + 3, {
      animate: true,
      duration: 2,
    });

    // using the public interface
    // workout.click();
  }
  _setLocalStorage() {
    
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
