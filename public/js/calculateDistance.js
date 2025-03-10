$(document).ready(function () {
    $('#calculate-distance').on('click', async function () {
        const city1 = $('#distance_city1').val().trim();
        const city2 = $('#distance_city2').val().trim();
        const mode = $('#mode').val() || 'driving'; // Default mode is driving

        if (city1 && city2) {
            const url = 'http://localhost:3000/getDistance'; // URL to your server's endpoint

            try {
                const response = await fetch(url, {
                    method: 'POST', // Use POST method as defined in your server
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ // Send data in JSON format
                        origin: city1,
                        destination: city2,
                        mode: mode
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log(data); // Log the entire response data (should be JSON)

                if (data.distance) {
                    let caldis = parseInt(data.distance.replace(" km", "").replace(/,/g, ''));

                    $('#distance').val(caldis); // Set distance in km
                    $('#calculated-distance').text(`Distance from ${city1} to ${city2}: ${data.distance}`);
                } else {
                    $('#calculated-distance').text('Could not calculate distance. Please check the city names.');
                }
            } catch (error) {
                console.error('Error fetching distance:', error);
                $('#calculated-distance').text('Error fetching distance. Please try again later.');
            }
        } else {
            $('#calculated-distance').text('Please enter both city names.');
        }
    });
});
