// Main function
$(document).ready(function () {
    let model; // Declare model variable here

    // Load data
    async function loadData(apiUrl) {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Data load error:', error);
            displayError('Error loading data. Please try again later.');
            throw error;
        }
    }

    // Display error in the UI
    function displayError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block'; // Show the error message
    }

    // Normalize data
    function normalizeData(data) {
        // Filter out records with missing values
        data = data.filter(row => {
            return row.Height !== undefined && row.Width !== undefined && row.Weight !== undefined && row.Cost !== undefined;
        });

        if (data.length === 0) {
            throw new Error('No valid data for normalization');
        }

        const maxValues = {
            Height: Math.max(...data.map(row => row.Height)) || 1,
            Width: Math.max(...data.map(row => row.Width)) || 1,
            Weight: Math.max(...data.map(row => row.Weight)) || 1,
        };

        console.log('Max Values:', maxValues);

        return data.map(row => ({
            Height: row.Height / maxValues.Height,
            Width: row.Width / maxValues.Width,
            Weight: row.Weight / maxValues.Weight,
            Cost: row.Cost
        }));
    }

    // Train the model
    async function trainModel(data) {
        const normalizedData = normalizeData(data);

        if (normalizedData.length === 0) {
            throw new Error('No data available for training');
        }

        const xs = normalizedData.map(({ Height, Width, Weight }) => [Height, Width, Weight]);
        const ys = normalizedData.map(({ Cost }) => Cost);
        const xsTensor = tf.tensor2d(xs);
        const ysTensor = tf.tensor1d(ys);

        // Split the data into training and testing sets
        const [trainXs, testXs] = tf.split(xsTensor, [Math.floor(xs.length * 0.8), xs.length - Math.floor(xs.length * 0.8)]);
        const [trainYs, testYs] = tf.split(ysTensor, [Math.floor(ys.length * 0.8), ys.length - Math.floor(ys.length * 0.8)]);

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [3] }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

        // Train the model
        await model.fit(trainXs, trainYs, { epochs: 100 });

        return model;
    }

    // Predict cost
    async function predictCost(model, height, width, weight) {
        // Check for valid input values
        if (isNaN(height) || isNaN(width) || isNaN(weight)) {
            throw new Error('Invalid input values');
        }

        const normalizedInput = [
            height / 17, // Assuming max height is 17 for normalization
            width / 6,   // Assuming max width is 6 for normalization
            weight / 4128 // Assuming max weight is 4128 for normalization
        ];

        // Check for NaN in normalized input
        if (normalizedInput.some(isNaN)) {
            throw new Error('NaN detected in normalized input');
        }

        const inputData = tf.tensor2d([normalizedInput]);
        const predictedCost = model.predict(inputData);
        let cost = predictedCost.dataSync()[0]; // Get the predicted cost

        // Check for NaN in predicted cost
        if (isNaN(cost)) {
            throw new Error('Predicted cost is NaN');
        }

        return Math.round(cost / 100) * 100; // Return the predicted cost rounded to the nearest hundred
    }

    // Load data and train model
    loadData('http://localhost:3000/testdata').then(data => {
        console.log('showing sliced Loaded Data:', data.slice(0, 5)); // Log first few rows of loaded data

        // Disable submit button and change color to orange
        const submitButton = document.querySelector('input[type="submit"]');
        submitButton.disabled = true;
        submitButton.style.background = 'orange';
        submitButton.style.cursor = 'not-allowed';

        trainModel(data).then(trainedModel => {
            model = trainedModel; // Assign trained model to global variable

            // Enable submit button and change color back to green
            submitButton.disabled = false;
            submitButton.style.background = '#28a745';
            submitButton.style.cursor = 'pointer';

            // Set up event listener for form submission
            $('#costCalculationForm').submit(function (e) {
                e.preventDefault(); // Prevent default form submission behavior

                try {
                    const height = parseFloat($('#itemHeight').val());
                    const width = parseFloat($('#itemWidth').val());
                    const weight = parseFloat($('#itemWeight').val());
                    const material = $('#itemMaterial').val(); // Material type
                    const distance = parseFloat($('#travelDistance').val());
                    const transport = $('#transportMethod').val();

                    // Predict cost
                    predictCost(model, height, width, weight).then(predictedCost => {
                        alert(`Predicted Cost: ${predictedCost}`);
                    });
                } catch (error) {
                    console.error('Error during form submission:', error);
                    displayError('An error occurred during form submission. Please try again.');
                }
            });
        });
    });
});
