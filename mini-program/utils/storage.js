const setToken = (token) => wx.setStorageSync('token', token);
const getToken = () => wx.getStorageSync('token');
const setUserInfo = (info) => wx.setStorageSync('userInfo', info);
const getUserInfo = () => wx.getStorageSync('userInfo');
const clearAll = () => wx.clearStorageSync();

module.exports = { setToken, getToken, setUserInfo, getUserInfo, clearAll };