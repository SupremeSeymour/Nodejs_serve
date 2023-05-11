require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const ethers = require('ethers')
const readline = require('readline');
const SSE = require('express-sse');
const compression = require('compression')


const app = express()

const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin); // Add this line
    console.log('Allowed origins:', process.env.ALLOWED_ORIGINS); // Add this line

    if (!origin || process.env.ALLOWED_ORIGINS.split(',').indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};


// Initialize SSE
const sse = new SSE();

app.use(cors(corsOptions));

app.use(bodyParser.json())

app.use(compression())

// SSE route
app.get('/stream', sse.init);

const providerAN = new ethers.providers.JsonRpcProvider(`https://cosmological-clean-sun.nova-mainnet.discover.quiknode.pro/${process.env.QUICKNODE_API_KEY}`)
const privateKey = process.env.PRIVATE_KEY
const walletAN = new ethers.Wallet(privateKey, providerAN)

//TEST

let counter = 0;

// // Test SSE route
// app.get('/testStream', sse.init);

// setInterval(() => {
//   console.log('Sending test event:', counter);
//   sse.send({ test: counter });
//   counter += 1;
// }, 5000);


app.post('/completeSession', async (req, res) => {
  try {
    const { address, abi, functionName, args } = req.body

    const contract = new ethers.Contract(address, abi, walletAN)
    const overrides = { gasLimit: 502466 }

    // Estimate gas and simulate transaction execution
    try {
      const estimatedGas = await contract.estimateGas[functionName](...args, overrides);
      console.log(`Estimated gas: ${estimatedGas}`);
    } catch (error) {
      console.error('Transaction would fail:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Send transaction
    const transactionResponse = await contract[functionName](...args, overrides)

    // Wait for the transaction to be successful
    const transactionReceipt = await providerAN.waitForTransaction(transactionResponse.hash)

    // Check if the transaction was successful
    if (transactionReceipt.status === 1) {
      res.json({ success: true, data: transactionResponse })
    } else {
      console.error('Transaction failed:', transactionReceipt)
      res.status(500).json({ success: false, message: 'Transaction failed.' })
    }
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})



app.post('/completeCaptcha', async (req, res) => {
  try {
    const { address, abi, functionName, args } = req.body

    const contract = new ethers.Contract(address, abi, walletAN)
    const overrides = { gasLimit: 902466 }

    // Estimate gas and simulate transaction execution
    try {
      const estimatedGas = await contract.estimateGas[functionName](...args, overrides);
      console.log(`Estimated gas: ${estimatedGas}`);
    } catch (error) {
      console.error('Transaction would fail:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Send transaction
    const transactionResponse = await contract[functionName](...args, overrides)

    // Wait for the transaction to be successful
    const transactionReceipt = await providerAN.waitForTransaction(transactionResponse.hash)

    // Check if the transaction was successful
    if (transactionReceipt.status === 1) {
      res.json({ success: true, data: transactionResponse, transactionHash: transactionResponse.hash }) 
    } else {
      console.error('Transaction failed:', transactionReceipt)
      res.status(500).json({ success: false, message: 'Transaction failed.' })
    }
  } catch (error) {
    console.error('Server error:', error.message, error.stack)
    res.status(500).json({ success: false, message: error.message })
  }
})




app.post('/listenEvent', async (req, res) => {
  try {
    const { address, abi, eventName } = req.body;
    const contract = new ethers.Contract(address, abi, walletAN);

    const eventSignature = ethers.utils.id(`${eventName}`); // modify this according to your event parameters
    const filter = {
      address: contract.address,
      topics: [eventSignature],
    };

    // providerAN.on(filter, (log) => {
    //   console.log(`${eventName} event detected:`, log);
    //   // Push event data to the SSE stream
    //   sse.send(log);
    // });

    providerAN.on({ address: contract.address }, (ts) => {
      console.log(`Event detected:`, ts);
      try {
        const decodedData = ethers.utils.defaultAbiCoder.decode(
          [ 'address', 'bool'],
          ts.data
        )
        console.log(decodedData);
        console.log('Sending data:', { address: decodedData[0], result: decodedData[1] });
        sse.send({ address: decodedData[0], result: decodedData[1] });
      } catch (error) {
        console.error('Error decoding data:', error);
      }
    });

    res.json({ success: true, message: `Listening for ${eventName} events` });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


app.post('/readContract', async (req, res) => {
  try {
      const { address, abi, functionName, args } = req.body

      const contract = new ethers.Contract(address, abi, walletAN)
      
      // Check if the function is callable i.e. it exists and it's a function
      if (typeof contract[functionName] !== 'function') {
          return res.status(400).json({
              success: false,
              message: 'Invalid function name provided.',
          })
      }

      // Call the function
      const result = await contract[functionName](...args)

      res.json({
          success: true,
          data: result
      })
  } catch (error) {
      console.error('Server error:', error)
      res.status(500).json({
          success: false,
          message: error.message
      })
  }
})



function handleCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', (input) => {
    const command = input.trim().toLowerCase();
    switch (command) {
      case 'sleep':
        enterStandbyMode();
        break;
      case 'wake':
        enterWakeMode();
        break;
      default:
        console.log('Unknown command. Use "sleep" or "wake"');
    }
  });
}


let serverInstance;

function enterStandbyMode() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Server is in standby mode');
    });
  } else {
    console.log('Server is already in standby mode');
  }
}

function enterWakeMode() {
  if (!serverInstance) {
    serverInstance = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } else {
    console.log('Server is already running');
  }
}


const PORT = process.env.PORT || 3001
serverInstance = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  handleCLI();
});


//In this setup, when the user clicks the button on the frontend, 
//it will send a request to the Node.js server.
//he server will then use ethers.js to interact with the contract and perform 
// the completeSession function. If the transaction is successful, the server will send a 
// success response back to the frontend, which will display it.