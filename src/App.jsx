import React, { useState, useEffect } from 'react';
import './App.css';
import web3Service from './services/web3Service';

function App() {
  const [account, setAccount] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [priceThreshold, setPriceThreshold] = useState('');
  const [selectedTaskIndex, setSelectedTaskIndex] = useState('');

  useEffect(() => {
    // Check if wallet is already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      const connectedAccount = await web3Service.connectWallet();
      setAccount(connectedAccount);
      await loadTasks();
      await loadTaskCount();
      await loadCurrentPrice();
      await checkAdminStatus(connectedAccount);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Oops! We had trouble connecting to your wallet. Please make sure MetaMask is installed and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const taskList = await web3Service.getTasks();
      console.log('Loaded tasks from blockchain:', taskList);
      setTasks(taskList);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTaskCount = async () => {
    try {
      const count = await web3Service.getTaskCount();
      setTaskCount(count);
    } catch (error) {
      console.error('Error loading task count:', error);
    }
  };

  const loadCurrentPrice = async () => {
    try {
      const price = await web3Service.getLatestPrice();
      setCurrentPrice(price);
    } catch (error) {
      console.error('Error loading current price:', error);
    }
  };

  const checkAdminStatus = async (address) => {
    try {
      const adminStatus = await web3Service.isAdmin(address);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const addTask = async () => {
    console.log('addTask function called with newTask:', newTask);
    if (!newTask.trim()) return;

    try {
      setLoading(true);
      console.log('Adding task to blockchain:', newTask);
      await web3Service.addTask(newTask);
      setNewTask('');
      await loadTasks();
      await loadTaskCount();
      console.log('Task added successfully');
      alert('🎉 Awesome! Your task has been added to the blockchain. Time to get things done!');
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Hmm, something went wrong while adding your task. Mind giving it another try?');
    } finally {
      setLoading(false);
    }
  };

  function to12DigitPriceFormat(value) {
    return BigInt(Math.round(parseFloat(value) * 1e8)).toString();
  }

  const completeTaskWithPrice = async () => {
    console.log('completeTaskWithPrice function called');
    console.log('Selected task index:', selectedTaskIndex);
    console.log('Price threshold:', to12DigitPriceFormat(priceThreshold));

    try {
      setLoading(true);
      console.log('Attempting to complete task based on current price...');
      await web3Service.completeTaskIfPriceAbove(parseInt(selectedTaskIndex), to12DigitPriceFormat(priceThreshold)); // Convert to 6 decimal places
      await loadTasks();
      console.log('Task completion attempt finished, threshold was ', to12DigitPriceFormat(priceThreshold));
      alert(`Task completion attempted! If current ETH price ($${formatPrice(currentPrice)}) is above $${priceThreshold}, your task should now be complete!`);
      setSelectedTaskIndex('');
      setPriceThreshold('');
    } catch (error) {
      console.error('Error completing task:', error);
      alert("Oops! We couldn't complete your task. The current price might be below your threshold, or there was a network issue. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatPrice = (price) => {
    // Convert from 8 decimal places (Chainlink price feeds typically use 8 decimals)
    return (price / 100000000).toFixed(2);
  };

  if (!account) {
    return (
      <div className="app">
        <div className="connect-wallet">
          <h1>Your Smart Todo App</h1>
          <p>Hey there! Let's connect your wallet and start managing tasks on the blockchain!</p>
          <button onClick={connectWallet} disabled={loading} className="connect-btn">
            {loading ? 'Connecting your wallet...' : 'Connect with MetaMask'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Your Smart Todo App</h1>
        <div className="wallet-info">
          <p>Hey {formatAddress(account)}!</p>
          {isAdmin && <span className="admin-badge">🔑 Admin</span>}
        </div>
      </header>

      <div className="stats">
        <div className="stat-item">
          <h3>Your Tasks</h3>
          <p>{taskCount}</p>
        </div>
        <div className="stat-item">
          <h3>ETH Price Right Now</h3>
          <p>{currentPrice ? `$${formatPrice(currentPrice)}` : 'Getting latest price...'}</p>
        </div>
      </div>

      <div className="add-task-section">
        <h2>What's on your mind?</h2>
        <div className="add-task-form">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Tell me what you need to get done..."
            disabled={loading}
          />
          <button onClick={addTask} disabled={loading || !newTask.trim()}>
            {loading ? 'Adding your task...' : 'Add to blockchain!'}
          </button>
        </div>
      </div>

      <div className="price-condition-section">
        <h2>Price-Based Task Completion</h2>
        <div className="price-condition-form">
          <select
            value={selectedTaskIndex}
            onChange={(e) => setSelectedTaskIndex(e.target.value)}
            disabled={loading}
          >
            <option value="">Pick a task...</option>
            {tasks.map((task, index) => (
              <option key={index} value={index}>
                Task {index + 1}: {task.text}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={priceThreshold}
            onChange={(e) => setPriceThreshold(e.target.value)}
            placeholder="Set price threshold (e.g., 2500.50)..."
            disabled={loading}
          />
          <button
            onClick={completeTaskWithPrice}
            disabled={loading || !selectedTaskIndex || !priceThreshold}
          >
            {loading ? 'Setting threshold...' : 'Complete if price allows'}
          </button>
        </div>
        <p className="helper-text">
          Task will be completed only if current ETH price is above your threshold when you click the button.
        </p>
      </div>

      <div className="tasks-section">
        <h2>Your Task Journey</h2>
        {tasks.length === 0 ? (
          <p className="no-tasks">Your task list is empty! Ready to add your first one? Let's make things happen!</p>
        ) : (
          <div className="tasks-list">
            {tasks.map((task, index) => (
              <div key={index} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <div className="task-content">
                  <h4>Task #{index + 1}</h4>
                  <p>{task.text}</p>
                  <small>Started: {formatTimestamp(task.timestamp)}</small>
                </div>
                <div className="task-status">
                  {task.completed ? (
                    <span className="status-completed">Done!</span>
                  ) : (
                    <span className="status-pending">In progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App
