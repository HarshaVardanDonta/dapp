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
      alert('Error connecting wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const taskList = await web3Service.getTasks();
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
    if (!newTask.trim()) return;

    try {
      setLoading(true);
      await web3Service.addTask(newTask);
      setNewTask('');
      await loadTasks();
      await loadTaskCount();
      alert('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeTaskWithPrice = async () => {
    if (!selectedTaskIndex || !priceThreshold) return;

    try {
      setLoading(true);
      await web3Service.completeTaskIfPriceAbove(parseInt(selectedTaskIndex), parseInt(priceThreshold));
      await loadTasks();
      alert('Task completion condition set successfully!');
      setSelectedTaskIndex('');
      setPriceThreshold('');
    } catch (error) {
      console.error('Error setting task completion condition:', error);
      alert('Error setting task completion condition: ' + error.message);
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
          <h1>Decentralized Todo App</h1>
          <p>Connect your wallet to get started</p>
          <button onClick={connectWallet} disabled={loading} className="connect-btn">
            {loading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Decentralized Todo App</h1>
        <div className="wallet-info">
          <p>Connected: {formatAddress(account)}</p>
          {isAdmin && <span className="admin-badge">Admin</span>}
        </div>
      </header>

      <div className="stats">
        <div className="stat-item">
          <h3>Total Tasks</h3>
          <p>{taskCount}</p>
        </div>
        <div className="stat-item">
          <h3>Current ETH Price</h3>
          <p>{currentPrice ? `$${formatPrice(currentPrice)}` : 'Loading...'}</p>
        </div>
      </div>

      <div className="add-task-section">
        <h2>Add New Task</h2>
        <div className="add-task-form">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter task description"
            disabled={loading}
          />
          <button onClick={addTask} disabled={loading || !newTask.trim()}>
            {loading ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </div>

      <div className="price-condition-section">
        <h2>Complete Task Based on Price</h2>
        <div className="price-condition-form">
          <select
            value={selectedTaskIndex}
            onChange={(e) => setSelectedTaskIndex(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a task</option>
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
            placeholder="Price threshold (in cents)"
            disabled={loading}
          />
          <button
            onClick={completeTaskWithPrice}
            disabled={loading || !selectedTaskIndex || !priceThreshold}
          >
            {loading ? 'Setting...' : 'Set Price Condition'}
          </button>
        </div>
        <p className="helper-text">
          Task will be automatically completed when ETH price goes above the threshold
        </p>
      </div>

      <div className="tasks-section">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p className="no-tasks">No tasks yet. Add your first task!</p>
        ) : (
          <div className="tasks-list">
            {tasks.map((task, index) => (
              <div key={index} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <div className="task-content">
                  <h4>Task #{index + 1}</h4>
                  <p>{task.text}</p>
                  <small>Created: {formatTimestamp(task.timestamp)}</small>
                </div>
                <div className="task-status">
                  {task.completed ? (
                    <span className="status-completed">✓ Completed</span>
                  ) : (
                    <span className="status-pending">⏳ Pending</span>
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
