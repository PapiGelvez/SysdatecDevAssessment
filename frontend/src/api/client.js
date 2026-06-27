import axios from "axios";

// All requests are proxied through Vite (/api -> backend:8000).
const client = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
