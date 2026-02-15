const { post } = require('../../utils/request');
const { getToken, getUserInfo } = require('../../utils/storage');

const BASE_URL = 'http://localhost:3000/api';

const REPAIR_TYPES = [
  { value: '水电维修', label: '水电维修', icon: '💧' },
  { value: '门窗维修', label: '门窗维修', icon: '🚪' },
  { value: '家具维修', label: '家具维修', icon: '🪑' },
  { value: '网络问题', label: '网络问题', icon: '📶' },
  { value: '其他', label: '其他', icon: '📦' }
];

Page({
  data: {
    repairTypes: REPAIR_TYPES,
    selectedTypeIndex: -1,
    building: '',
    roomNumber: '',
    contactPhone: '',
    description: '',
    images: [],
    uploading: false,
    submitting: false,
    maxImages: 3,
    userInfo: null
  },

  onLoad() {
    const userInfo = getUserInfo();
    this.setData({
      userInfo,
      building: userInfo.building || '',
      roomNumber: userInfo.roomNumber || '',
      contactPhone: userInfo.phone || ''
    });
  },

  // Repair type picker
  onTypeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      selectedTypeIndex: index
    });
  },

  // Input handlers
  onBuildingInput(e) {
    this.setData({ building: e.detail.value });
  },

  onRoomInput(e) {
    this.setData({ roomNumber: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  // Image upload
  chooseImage() {
    const { images, maxImages } = this.data;
    const remainCount = maxImages - images.length;

    if (remainCount <= 0) {
      wx.showToast({
        title: `最多上传${maxImages}张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths);
      }
    });
  },

  uploadImages(filePaths) {
    const token = getToken();
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ uploading: true });
    const uploadedUrls = [];

    const uploadPromises = filePaths.map(filePath => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${BASE_URL}/upload/repair`,
          filePath: filePath,
          name: 'image',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.code === 200 && data.data && data.data.urls) {
                uploadedUrls.push(...data.data.urls);
                resolve();
              } else {
                reject(new Error(data.message || '上传失败'));
              }
            } catch (e) {
              reject(new Error('解析响应失败'));
            }
          },
          fail: reject
        });
      });
    });

    Promise.all(uploadPromises)
      .then(() => {
        this.setData({
          images: [...this.data.images, ...uploadedUrls],
          uploading: false
        });
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      })
      .catch(err => {
        console.error('Upload error:', err);
        this.setData({ uploading: false });
        wx.showToast({
          title: err.message || '上传失败',
          icon: 'none'
        });
      });
  },

  // Remove image
  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  // Preview image
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  // Validate phone number
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // Submit form
  submitForm() {
    const { 
      selectedTypeIndex, 
      building, 
      roomNumber, 
      contactPhone, 
      description,
      images,
      submitting 
    } = this.data;

    // Validation
    if (selectedTypeIndex < 0) {
      wx.showToast({
        title: '请选择报修类型',
        icon: 'none'
      });
      return;
    }

    if (!building.trim()) {
      wx.showToast({
        title: '请输入楼栋',
        icon: 'none'
      });
      return;
    }

    if (!roomNumber.trim()) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      });
      return;
    }

    if (!contactPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return;
    }

    if (!this.validatePhone(contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    if (!description.trim()) {
      wx.showToast({
        title: '请输入问题描述',
        icon: 'none'
      });
      return;
    }

    if (submitting) {
      return;
    }

    const repairType = REPAIR_TYPES[selectedTypeIndex].value;

    this.setData({ submitting: true });

    const requestData = {
      repairType,
      building: building.trim(),
      roomNumber: roomNumber.trim(),
      contactPhone: contactPhone.trim(),
      description: description.trim(),
      imageUrls: images
    };

    post('/orders', requestData)
      .then(res => {
        if (res.code === 200) {
          wx.showToast({
            title: '报修成功',
            icon: 'success',
            duration: 2000
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '提交失败',
            icon: 'none'
          });
          this.setData({ submitting: false });
        }
      })
      .catch(err => {
        console.error('Submit error:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        this.setData({ submitting: false });
      });
  }
});