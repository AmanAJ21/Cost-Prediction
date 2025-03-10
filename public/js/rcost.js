$(document).ready(function () {
    let model; // Declare model variable here
    let maxValues = {}; // Store max values for normalization

    console.log("DOM fully loaded and parsed");

    // Check if TensorFlow.js is loaded
    if (typeof tf === 'undefined') {
        displayError("TensorFlow.js is not loaded. Please check your internet connection or CDN.");
        return; // Stop execution if TensorFlow.js is not loaded
    } else {
        console.log("TensorFlow.js is loaded successfully:", tf);
    }

    // Display error in the UI
    function displayError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            console.error('Error element not found in the DOM.');
        }
    }

    // Load data
    async function loadData(apiUrl) {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            const data = await response.json();
            console.log("Fetched data:", data);
            return data;
        } catch (error) {
            console.error('Data load error:', error);
            displayError('Error loading data. Please try again later.');
            throw error;
        }
    }

    // Normalize and clean data
    function normalizeData(data) {
        const filteredData = data.filter(row => {
            return Object.values(row).every(value => value !== null && value !== undefined && value !== '');
        });

        if (filteredData.length === 0) {
            throw new Error('No valid data for normalization');
        }

        // Calculate max values for normalization
        maxValues = {
            Distance: Math.max(...filteredData.map(row => row.Distance)) || 1,
            Length: Math.max(...filteredData.map(row => row.Length)) || 1,
            Width: Math.max(...filteredData.map(row => row.Width)) || 1,
            Height: Math.max(...filteredData.map(row => row.Height)) || 1,
            Weight: Math.max(...filteredData.map(row => row.Weight)) || 1,
        };

        console.log('Max Values:', maxValues);

        return filteredData.map(row => ({
            Distance: row.Distance / maxValues.Distance,
            Length: row.Length / maxValues.Length,
            Width: row.Width / maxValues.Width,
            Height: row.Height / maxValues.Height,
            Weight: row.Weight / maxValues.Weight,
            Rate: row.Rate
        }));
    }

    // Train the model
    async function trainModel(data) {
        const normalizedData = normalizeData(data);
        console.log("Normalized data:", normalizedData);

        if (normalizedData.length === 0) {
            throw new Error('No data available for training');
        }

        const xs = normalizedData.map(({ Distance, Length, Width, Height, Weight }) => [Distance, Length, Width, Height, Weight]);
        const ys = normalizedData.map(({ Rate }) => Rate);
        const xsTensor = tf.tensor2d(xs);
        const ysTensor = tf.tensor1d(ys);

        // Split the data into training and testing sets
        const splitIndex = Math.floor(xs.length * 0.8);
        const trainXs = xsTensor.slice([0, 0], [splitIndex, xsTensor.shape[1]]);
        const trainYs = ysTensor.slice([0], [splitIndex]);
        const testXs = xsTensor.slice([splitIndex, 0], [xsTensor.shape[0] - splitIndex, xsTensor.shape[1]]);
        const testYs = ysTensor.slice([splitIndex], [ysTensor.shape[0] - splitIndex]);

        console.log("Training data shape:", trainXs.shape, trainYs.shape);
        console.log("Testing data shape:", testXs.shape, testYs.shape);

        // Model architecture
        model = tf.sequential();
        model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [5] }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));

        // Compile model
        model.compile({ 
            loss: 'meanSquaredError', 
            optimizer: tf.train.adam(0.001) 
        });

        // Train model
        await model.fit(trainXs, trainYs, {
            epochs: 400,
            validationData: [testXs, testYs],
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                }
            }
        });

        return model;
    }

    // Predict cost
    async function predictCost(model, distance, length, width, height, weight) {
        if ([distance, length, width, height, weight].some(isNaN)) {
            throw new Error('Invalid input values');
        }

        const normalizedInput = [
            distance / maxValues.Distance,
            length / maxValues.Length,
            width / maxValues.Width,
            height / maxValues.Height,
            weight / maxValues.Weight
        ];

        const inputData = tf.tensor2d([normalizedInput]);
        const predictedCost = model.predict(inputData);
        let cost = predictedCost.dataSync()[0];

        if (isNaN(cost)) {
            console.log('Predicted cost is NaN. Input data:', normalizedInput);
            cost = 0;
        }
        console.log('Predicted cost:', cost);

        return Math.round(cost);
    }

    // Initialize application
    loadData('http://localhost:3000/realdata').then(data => {
        console.log('Loaded data samples:', data.slice(0, 5));

        const submitButton = document.querySelector('input[type="submit"]');
        submitButton.disabled = true;
        submitButton.style.background = 'orange';
        submitButton.style.cursor = 'not-allowed';

        trainModel(data).then(trainedModel => {
            model = trainedModel;
            submitButton.disabled = false;
            submitButton.style.background = '#28a745';
            submitButton.style.cursor = 'pointer';

            // Form handler
            $('#distance-form').submit(function (e) {
                e.preventDefault();
                try {
                    const inputs = {
                        distance: parseFloat($('#distance').val()),
                        length: parseFloat($('#length').val()),
                        width: parseFloat($('#width').val()),
                        height: parseFloat($('#height').val()),
                        weight: parseFloat($('#weight').val())
                    };

                    predictCost(model, 
                        inputs.distance,
                        inputs.length,
                        inputs.width,
                        inputs.height,
                        inputs.weight
                    ).then(predictedCost => {
                        document.getElementById('result').textContent = 
                            `Predicted Cost: ${predictedCost}`;
                    });
                } catch (error) {
                    console.error('Submission error:', error);
                    displayError('Error during prediction. Please check inputs.');
                }
            });
        }).catch(error => {
            console.error('Training failed:', error);
            displayError('Model training failed. Please try again.');
        });
    }).catch(error => {
        console.error('Data loading failed:', error);
        displayError('Failed to load data. Please check connection.');
    });
});