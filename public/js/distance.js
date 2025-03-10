document.getElementById('distanceForm').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent default form submission

    const cityA = document.getElementById('cityA').value;
    const cityB = document.getElementById('cityB').value;
    const mode = document.getElementById('mode').value;

    const url = 'http://localhost:3000/getDistance'; // URL to your server's endpoint

    console.log(`Requesting distance from ${cityA} to ${cityB} with mode ${mode}`); // Log the request

    try {
        const response = await fetch(url, {
            method: 'POST', // Use POST method as defined in your server
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ // Send data in JSON format
                origin: cityA,
                destination: cityB,
                mode: mode
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data); // Log the entire response data (should be JSON)

        if (data.distance) {
            document.getElementById('result').textContent = `Distance from ${cityA} to ${cityB}: ${data.distance}`;
            document.getElementById('error').textContent = ''; // Clear any previous errors
        } else {
            throw new Error('Distance not found in response');
        }
    } catch (error) {
        console.error('Error fetching distance:', error);
        document.getElementById('error').textContent = 'Error fetching distance. Please try again.'; // Set error message
        document.getElementById('result').textContent = ''; // Clear distance on error
    }
});
