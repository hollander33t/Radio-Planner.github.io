document.addEventListener('DOMContentLoaded', () => {
    const radioManager = new RadioManager();
    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleList = document.getElementById('scheduleList');
    const playStopBtn = document.getElementById('playStopBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const timeInput = document.getElementById('timeInput');
    const stationSelect = document.getElementById('stationSelect');
    const clearListBtn = document.getElementById('clearListBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    // Nieuwe elementen voor Now Playing
    const nowPlayingSection = document.getElementById('nowPlaying');
    const currentStationText = document.getElementById('currentStation');
    const timerText = document.getElementById('timer');

    // Element voor live tijd
    const liveTimeSpan = document.getElementById('liveTime');

    // Element voor de achtergrond
    const backgroundContainer = document.getElementById('background-container');

    // Array om het schema op te slaan
    let schedule = [];
    let timerInterval; // Variabele voor de timer
    let isPlaying = false; // Bijhouden of er wordt afgespeeld
    let stations = []; // Array om de stations op te slaan

    // Zorg ervoor dat de 'Now Playing' sectie verborgen is bij het opstarten
    nowPlayingSection.classList.add("hidden");

    function updateStartTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }

    // Initiële update van de starttijd
    updateStartTime();

    function loadStations() {
        fetch('data/stations.json')
            .then(response => response.json())
            .then(data => {
                stations = data; // Sla de stations op in de globale variabele
                stationSelect.innerHTML = ''; 
                stations.forEach(station => {
                    const option = document.createElement('option');
                    option.value = station.name;
                    option.textContent = station.name;
                    stationSelect.appendChild(option);
                });
                console.log('Stations geladen:', stations);
            })
            .catch(error => console.error('Error loading stations:', error));
    }

    loadStations();

   timeInput.addEventListener('wheel', (e) => {
        e.preventDefault(); 

        const currentValue = timeInput.value;
        let [hours, minutes] = currentValue.split(':').map(Number);

        if (e.deltaY < 0) {
            minutes += 1;
            if (minutes >= 60) {
                minutes = 0;
                hours = (hours + 1) % 24;
            }
        } else {
            minutes -= 1;
            if (minutes < 0) {
                minutes = 59;
                hours = (hours - 1 + 24) % 24;
            }
        }

        timeInput.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
   });

   timeInput.addEventListener('focus', function() {
       this.select();
   });

   scheduleForm.addEventListener('submit', (e) => {
       e.preventDefault();
       const time = timeInput.value;
       const station = stationSelect.value;

       // Voeg zender toe aan het schema
       schedule.push({ time, station });
       
       // Sorteer het schema op tijd
       schedule.sort((a, b) => a.time.localeCompare(b.time));

       // Leeg de huidige lijst en voeg gesorteerde items toe
       updateScheduleList();

       // Reset het formulier zonder de tijd bij te werken
       scheduleForm.reset();
       
       document.getElementById('message').classList.add('hidden');

       // Toon succesmelding
       showSuccessMessage('Zender succesvol toegevoegd!');

       // Update de timer als er al wordt afgespeeld
       if (isPlaying) {
           startTimer();
       }
   });

   function updateScheduleList() {
       // Leeg de huidige lijst en voeg gesorteerde items toe
       scheduleList.innerHTML = '';
       schedule.forEach(item => {
           const listItem = document.createElement('li');
           listItem.innerHTML = `<strong>${item.time}</strong> ${item.station}`;
           listItem.dataset.station = item.station;

           // Maak de X knop
           const removeButton = document.createElement('button');
           removeButton.className = 'remove-button';
           removeButton.onclick = () => {
               scheduleList.removeChild(listItem);
               schedule = schedule.filter(i => i.time !== item.time || i.station !== item.station);
               showSuccessMessage(`Zender "${item.station}" om ${item.time} succesvol verwijderd!`);
               
               if (schedule.length === 0) {
                   clearSchedule(); // Dit zal het afspelen stoppen als het schema leeg is
               } else {
                   updateScheduleList();
                   if (isPlaying) {
                       startTimer();
                   }
               }
           };

           // Stel de achtergrondafbeelding in voor de X-knop
           removeButton.style.backgroundImage = "url('resources/X.png')";
           removeButton.style.backgroundSize = "contain";
           removeButton.style.backgroundRepeat = "no-repeat";
           removeButton.style.width = "20px";
           removeButton.style.height = "20px";
           removeButton.style.border = "none";

           listItem.appendChild(removeButton);
           scheduleList.appendChild(listItem);
       });

       if (schedule.length > 0 && isPlaying) {
           nowPlayingSection.classList.remove("hidden");
           updateNowPlaying();
       } else {
           nowPlayingSection.classList.add("hidden");
       }
   }

   function updateBackground(stationName) {
       const station = stations.find(s => s.name === stationName);
       if (station && station.logo) {
           backgroundContainer.style.backgroundImage = `url('${station.logo}')`;
       } else {
           // Standaard achtergrond als er geen logo is
           backgroundContainer.style.backgroundImage = 'none';
           backgroundContainer.style.backgroundColor = '#your-default-color'; // Pas deze kleur aan naar wens
       }
   }

   function updateNowPlaying() {
       const now = new Date();
       console.log("Huidige tijd:", now);

       if (schedule.length === 0) {
           console.log("Geen zenders in het schema");
           currentStationText.innerHTML = '<strong>Geen zenders in het schema</strong>';
           timerText.textContent = '';
           return;
       }

       let currentStationIndex =
         schedule.findIndex(item => {
             const [itemHours, itemMinutes] =
                 item.time.split(':').map(Number);
             const itemDate =
                 new Date(now.getFullYear(), now.getMonth(), now.getDate(), itemHours, itemMinutes);
             return itemDate > now;
         }) - 1;

       // Als er geen volgende zender is gevonden, neem dan de laatste zender
       if (currentStationIndex === -1) {
           currentStationIndex =
             schedule.length - 1; // Laatste zender
       }

       console.log("Huidige station index:", currentStationIndex);

       const currentStationData =
         schedule[currentStationIndex];
       
       console.log("Huidige station data:", currentStationData);

       // Zoek de bijbehorende stream link in stations.json
       const stationData =
         stations.find(station => station.name === currentStationData.station);
       
       console.log("Gevonden station data:", stationData);

       if (stationData) {
           currentStationText.innerHTML =
               `Nu aan het spelen: <strong>${currentStationData.station}</strong>`;

           // Update de achtergrond
           updateBackground(currentStationData.station);

           console.log("Huidige afspeelstatus:", isPlaying);
           
           // Stop de huidige stream als deze er is
           if (isPlaying) {
               console.log("Pauzeren van huidige stream");
               radioManager.pauseStream();
           }

           // Start de nieuwe stream
           console.log("Starten van nieuwe stream:", stationData.url);
           radioManager.playStream(stationData.url);

           console.log(`Afspelen gestart voor: ${currentStationData.station}`);
           isPlaying =
             true;

           // Start timer voor de eerstvolgende zender
           startTimer(currentStationIndex);
       } else {
           console.log("Geen overeenkomende station data gevonden");
       }
   }

   function getCurrentTimeString() {
       const now =
         new Date();
       
         return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`; 
   }

   function showSuccessMessage(message) { 
         const messageBox =
         document.getElementById('message'); 
         messageBox.innerHTML =
         `<span class="message-text">${message}</span>`; 
         
         messageBox.classList.remove('hidden'); 
         messageBox.classList.add('visible'); 
         
         messageBox.style.backgroundColor =
         '#d4edda'; 
         messageBox.style.color =
         '#155724'; 
         messageBox.style.border =
         '1px solid #c3e6cb'; 

         setTimeout(() => { 
             messageBox.classList.remove('visible'); 
             setTimeout(() => { 
                 messageBox.classList.add('hidden'); 
             }, 500); 
         }, 3000); 
     }

     function showMessage(message) { 
         const messageBox =
         document.getElementById('message'); 
         messageBox.innerHTML =
         `<span class="message-text">${message}</span>`; 
         
         messageBox.classList.remove('hidden'); 
         messageBox.classList.add('visible');

         setTimeout(() => { 
             messageBox.classList.remove('visible'); 
             setTimeout(() => { 
                 messageBox.classList.add('hidden'); 
             }, 500); 
         }, 3000); 
     }

     playStopBtn.addEventListener('click', () => { 
         if (!isPlaying) { 
             if (schedule.length < 2) { 
                 showMessage(
                     'Afspelen is alleen mogelijk met 2 of meer zenders in het schema.'); 
                 return; 
             } 

             nowPlayingSection.classList.remove("hidden"); 
             updateNowPlaying(); 
             playStopBtn.textContent =
             'Stop'; 
             isPlaying =
             true; 
         } else { 
             radioManager.pauseStream(); 
             nowPlayingSection.classList.add("hidden"); 
             clearInterval(timerInterval); 
             playStopBtn.textContent =
             'Play'; 
             isPlaying =
             false; 
         } 
     });

     volumeSlider.addEventListener('input', (e) => { radioManager.setVolume(e.target.value / 100); });

     function startTimer(currentStationIndex) {
        clearInterval(timerInterval);

        const now =
          new Date();
        
        let nextStationIndex;

        if (currentStationIndex + 1 >= schedule.length) {
            nextStationIndex= 0; // Ga terug naar de eerste zender als we bij het einde zijn.
        } else {
            nextStationIndex= currentStationIndex + 1; // Volgende zender.
        }

        let nextDate;
        
        if (nextStationIndex === 0 && currentStationIndex === schedule.length - 1) {  
            // Als we teruggaan naar de eerste zender, stel dan het tijdstip in op morgen.
            const tomorrowDate=
              new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const [nextHours, nextMinutes] =
              schedule[0].time.split(':').map(Number);
            nextDate=
              new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate(), nextHours, nextMinutes, 0);
        } else {
            const [nextHours, nextMinutes] =
              schedule[nextStationIndex].time.split(':').map(Number);
            nextDate=
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHours, nextMinutes, 0);
        }

        let remainingTimeInSeconds=
          Math.floor((nextDate - now) / 1000);

        updateTimerText(remainingTimeInSeconds,
                         schedule[nextStationIndex].station);

        timerInterval=
          setInterval(() => {
              remainingTimeInSeconds--;

              if (remainingTimeInSeconds <= 0) {
                  clearInterval(timerInterval);
                  updateNowPlaying(); // Update naar de volgende zender.
              } else {
                  updateTimerText(remainingTimeInSeconds,
                                  schedule[nextStationIndex].station);
              }
          }, 1000);
     }

     function updateTimerText(seconds, nextStationName) {
        if (seconds <= 0)
          return;

        const hours=
          Math.floor(seconds / 3600);
        const minutes=
          Math.floor((seconds % 3600) / 60);
        const secs=
          seconds % 60;

        let timeString=
          '';

        if (hours > 0) {
            timeString += `${hours} uur, `;
        }

        if (minutes > 0 || hours > 0) {
            timeString += `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'} en `;
        }

        timeString += `${secs} ${secs === 1 ? 'seconde' : 'seconden'}`;

        timerText.innerHTML=
          `Nog <strong>${timeString}</strong> tot <strong>${nextStationName}</strong>`;
     }

     function formatTime(minutes) {  
         if (minutes <= 0)
             return '00:00';  

         const hrs=
             Math.floor(minutes / 60).toString().padStart(2, '0');  
         
         const mins=
             (minutes % 60).toString().padStart(2, '0');  

         return `${hrs}:${mins}`;  
     }

     function clearSchedule() {  
         schedule=
             [];  

         updateScheduleList();  
         
         nowPlayingSection.classList.add("hidden");  
         
         clearInterval(timerInterval);  
         
         playStopBtn.textContent=
             'Play';  
         
         if (isPlaying) {
             radioManager.pauseStream();
             isPlaying=false;
         }

         backgroundContainer.style.backgroundImage='none';
         backgroundContainer.style.backgroundColor='#your-default-color';
     }

     clearListBtn.addEventListener('click', () => {  
         if (schedule.length === 0) {  
             showMessage(
                 'De lijst is al leeg!');   
             return;   
         }  

         clearSchedule();   
         
         showSuccessMessage(
             'Alle zenders zijn verwijderd!');   
     });

     function exportSchedule() {   
         if (schedule.length === 0) {   
             showMessage(
                 'Kan niet exporteren, het schema is leeg!');   
             return;   
         }   

         const scheduleText=
          schedule.map(item =>
          `${item.time},${item.station}`).join('\n');   

          const now=
          new Date();   
          
          const day=
          String(now.getDate()).padStart(2,'0');   
          
          const month=
          String(now.getMonth() +1).padStart(2,'0');   
          
          const year=
          now.getFullYear();   

          const fileName=
          `radio_schema_${day}-${month}-${year}.txt`;   

          const blob=
          new Blob([scheduleText], { type: 'text/plain' });   
          
          const a=
          document.createElement('a');   
          
          a.href=
          URL.createObjectURL(blob);   
          
          a.download=
          fileName;   

          a.click();    
      }

      exportBtn.addEventListener('click', (e) => {   
          e.preventDefault();   
          
          exportSchedule();    
      });

      importBtn.addEventListener('click', (e) => {    
          e.preventDefault();    
          
          importFile.click();    
      });

      importFile.addEventListener('change', (e) => {    
          e.preventDefault();    
          
          importSchedule(e);    
      });

      function importSchedule(event) {    
          const file=
          event.target.files[0];    
          
          if (file) {    
              const reader=
              new FileReader();    
              
              reader.onload= function(e) {    
                  const content=
                  e.target.result;    
                  
                  const lines=
                  content.split('\n');    
                  
                  schedule=
                  lines.map(line => {    
                      const [time, station]= line.split(',');    
                      
                      return { time, station };    
                  }).filter(item=> item.time && item.station);    

                  updateScheduleList();    

                  showSuccessMessage(
                      'Schema succesvol geïmporteerd!');    
              };    

              reader.readAsText(file);    
          }    
      }

      clearSchedule();

      function updateLiveTime() {     
          function setTime() {     
              const now= new Date();     
              
              liveTimeSpan.textContent= `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;     
          }

          setTime();     

          setInterval(setTime,1000);     
      }

      updateLiveTime();     
});
