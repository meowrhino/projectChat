const API_BASE_RAW =
  window.localStorage.getItem("mp_api") ||
  window.__API_BASE ||
  "https://projectchat-yo8v.onrender.com";

const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");
