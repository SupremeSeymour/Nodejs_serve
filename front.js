import axios from 'axios'

const handleClick = async () => {
  try {
    const response = await axios.post('http://localhost:3001/completeSession', {
      address: CookieClicker_ADDRESS,
      abi: CookieClicker_ABI,
      functionName: 'completeSession',
      args: [browserID, address],
    })

    if (response.data.success) {
      console.log('Transaction successful:', response.data.data)
    } else {
      console.error('Transaction failed:', response.data.message)
    }
  } catch (error) {
    console.error('Error while sending request:', error.message)
  }
}

return <button onClick={handleClick}>Complete Session</button>
