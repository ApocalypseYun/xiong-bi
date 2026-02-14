# Learnings - Dormitory Repair System

## 2026-02-14: Auth API Implementation

### Database Patterns
- Use `pool.execute()` for parameterized queries (prevents SQL injection)
- Results come as `[rows, fields]` array - destructure to get rows
- Use `result.insertId` for auto-increment ID after INSERT

### Authentication Patterns
- bcryptjs for password hashing: `bcrypt.hash(password, 10)` and `bcrypt.compare(password, hash)`
- JWT token generation: `jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })`
- JWT_SECRET is exported from `middleware/auth.js`

### Response Format
- Success: `success(res, data, message)` -> `{ code: 200, message, data }`
- Error: `error(res, message, code)` -> `{ code, message }`

### Route Structure
- Routes in `routes/auth.js` using express.Router()
- Controllers in `controllers/authController.js`
- Export functions individually: `module.exports = { register, login, resetPassword }`

### Required Dependencies
- bcryptjs - for secure password hashing (added to package.json)

## 2026-02-14: User Management API Implementation

### User Profile Endpoints
- GET /api/user/profile - Returns current user data (excludes password)
- PUT /api/user/profile - Updates allowed fields: realName, phone, roomNumber, building

### Authentication in Routes
- Use `router.use(authenticate)` middleware for protected routes
- User data available via `req.user` after auth middleware
- JWT payload contains: `{ userId, username, role }`

### Dynamic Update Pattern
- Build SQL updates dynamically with array of fields
- Use parameterized queries to prevent SQL injection
- Validate phone format with regex: `/^1[3-9]\d{9}$/`

### Security Considerations
- Never expose password field in responses
- Users can only update their own profile (via userId from JWT)
- Password updates handled separately (reset-password endpoint)
- Username/role changes not allowed via profile API

## 2026-02-14: Image Upload API Implementation

### Multer Configuration
- Upload middleware in `middleware/upload.js` - single multer instance reused
- Files saved to `public/images/` with timestamp-random naming
- Max size: 5MB per file, images only (mimetype check)
- Directory auto-created if not exists: `fs.mkdirSync(uploadDir, { recursive: true })`

### Upload Route Patterns
- Use `upload.fields([...])` for multiple field names with different limits
- Support both `image` (single) and `images` (multiple, max 5) field names
- Files available via `req.files.image` and `req.files.images`
- Build full URLs dynamically: `${req.protocol}://${req.get('host')}/images/${filename}`

### Role-Based Upload Access
- `/api/upload/repair` - Students only (`authorize(['student'])`)
- `/api/upload/completion` - Admins only (`authorize(['admin'])`)

### Error Handling for Multer
- `LIMIT_FILE_SIZE` - File too large
- `LIMIT_UNEXPECTED_FILE` - Wrong field name
- `Only image files allowed` - Wrong file type
- Use router-level error middleware: `router.use((err, req, res, next) => ...)`


## 2026-02-14: Admin Order API Implementation

### Route Protection Pattern
- Use `router.use(authenticate)` followed by `router.use(authorize(['admin']))` for admin-only routes
- This ensures all routes in the router require both authentication AND admin role

### Date Filtering Pattern
- Accept query params: `startDate` and `endDate`
- Build SQL dynamically with `WHERE 1=1` base for conditional filters
- For end date, append `23:59:59` to include the full day: `endDate + ' 23:59:59'`

### Status Transition Validation
- Always validate current status before allowing transitions
- Valid flow: `pending` → `processing` → `completed`
- Return specific error messages for invalid transitions

### Transaction Pattern for Multi-Table Operations
- Use `pool.getConnection()` to get a connection
- Use `connection.beginTransaction()`, `connection.commit()`, `connection.rollback()`
- Always release connection in `finally` block
- Pattern for completion with images: update order + insert images in one transaction

### Related Data Loading
- For orders with images, fetch images in a separate query after getting orders
- Use `for...of` loop to attach images to each order
- Conditionally fetch completion images only for completed orders

### Order Acceptance
- Record `adminId` when accepting order to track which admin handled it
- Status changes from `pending` to `processing`

### Order Completion
- Require `completionImageUrls` array in request body
- Record `completedAt` timestamp when marking as completed
- Insert images into `completionImages` table with `uploadedBy` tracking

## 2026-02-14: Student Order API Implementation

### Endpoints
- POST /api/orders - Create order (student only, via `authorize(['student'])`)
- GET /api/orders - List user's orders with optional status filter
- GET /api/orders/:id - Order details with images, completionImages, and evaluation

### Bulk Insert for Images
- Use `connection.query()` (not execute) for bulk inserts with nested arrays
- Format: `INSERT INTO orderImages (orderId, imageUrl) VALUES ?` with `[[orderId, url1], [orderId, url2]]`

### Data Isolation
- Always filter by userId to ensure users only see their own orders
- Check `WHERE orderId = ? AND userId = ?` for detail queries
- Return 404 if order doesn't belong to user (don't reveal existence)

### Status Filtering
- Valid statuses: 'pending', 'processing', 'completed'
- Query param: `?status=pending`
- Return 400 for invalid status values

### Order Detail Response Structure
```javascript
{
  orderId, userId, repairType, building, roomNumber, contactPhone, description, status, adminId, createdAt, completedAt,
  images: [{ imageId, imageUrl, createdAt }],
  completionImages: [{ imageId, imageUrl, createdAt }],
  evaluation: { evaluationId, rating, comment, createdAt } | null
}
```

## 2026-02-14: Evaluation and Announcement API Implementation

### Evaluation Endpoints
- POST /api/evaluations - Create evaluation (student, requires auth)
- GET /api/evaluations - List my evaluations (student, requires auth)
- GET /api/evaluations/admin - List all evaluations (admin only)

### Evaluation Business Rules
- Only allow evaluation on orders with status `completed`
- One evaluation per order (check if exists before creating)
- Rating must be between 1-5
- User can only evaluate their own orders (verify `order.userId === req.user.userId`)

### Evaluation Creation Validation Flow
1. Check required fields (orderId, rating)
2. Validate rating range (1-5)
3. Verify order exists and belongs to user
4. Verify order status is 'completed'
5. Check for duplicate evaluation
6. Insert evaluation

### Announcement Endpoints
- GET /api/announcements - Public announcement list (no auth)
- POST /api/announcements/admin - Create announcement (admin only)
- PUT /api/announcements/admin/:id - Update announcement (admin only)
- DELETE /api/announcements/admin/:id - Delete announcement (admin only)

### Public vs Admin Routes Pattern
- Public routes: No middleware, accessible by anyone
- Admin routes: `authenticate` + `authorize(['admin'])` middleware chain
- Admin routes use `/admin` suffix to distinguish from public routes

### Announcement Ordering
- Always return announcements ordered by `createdAt DESC` (newest first)

## 2026-02-14: Student Pages Implementation

### Student Homepage (pages/student/)
- User info header with avatar, name, room info
- Swiper-based announcement carousel showing latest 5 announcements
- Quick action grid: 我要报修, 报修记录, 服务评价
- Logout functionality
- Pull-to-refresh support
- Warm, earthy color palette (beiges, browns, soft gradients)

### Student Repair Page (pages/student-repair/)
- Repair type picker with emoji icons (水电维修, 门窗维修, 家具维修, 网络问题, 其他)
- Building, room number, contact phone inputs
- Contact phone validation with regex: `/^1[3-9]\d{9}$/`
- Description textarea with character count
- Image upload using wx.chooseImage + wx.uploadFile
  - Max 3 images per order
  - Image preview and removal
  - Loading state during upload
- Form validation for all required fields
- Submit with loading state
- Success feedback and navigate back

### WeChat Mini-Program Patterns
- Use `getUserInfo()` from storage to pre-fill user data
- Token from `getToken()` for authenticated API calls
- `wx.chooseImage` with `sizeType: ['compressed']` to reduce upload size
- `wx.uploadFile` for multipart uploads with Authorization header
- `wx.navigateBack()` after successful submission
- JSON parse response from uploadFile: `JSON.parse(res.data)`

### API Integration
- GET /announcements - Public, no auth required
- POST /upload/repair - Requires Bearer token, returns { urls: [...] }
- POST /orders - Requires auth, creates repair order

### Styling Approach
- Warm minimal palette with organic, natural tones
- Soft gradients and rounded corners (20-48rpx)
- Box shadows for depth
- Consistent spacing system

## 2026-02-14: Student Records and Evaluation Pages Implementation

### WeChat Mini Program Page Structure
- Each page consists of: `.js` (logic), `.wxml` (template), `.wxss` (styles), `.json` (config)
- Page config: `navigationBarTitleText`, `enablePullDownRefresh`, `backgroundColor`
- Global styles defined in `app.wxss`, page-specific in page `.wxss`

### API Integration Patterns
- Base URL: `http://localhost:3000` for development
- Token from storage: `wx.getStorageSync('token')`
- Request headers: `{ 'Authorization': 'Bearer ' + token }`
- Response format: `{ code: 200, data: [...], message: '...' }`

### Status Mapping
```javascript
const statusMap = {
  'pending': { text: '待处理', color: '#f5a623', bgColor: '#fff7e6' },
  'processing': { text: '处理中', color: '#4a90d9', bgColor: '#e6f2ff' },
  'completed': { text: '已完成', color: '#7ed321', bgColor: '#e8f5e0' }
};
```

### Pull-to-Refresh Implementation
- Enable in page config: `"enablePullDownRefresh": true`
- Bind event: `bindrefresherrefresh="onPullDownRefresh"`
- Stop animation: `wx.stopPullDownRefresh()`
- Reset pagination and data on refresh

### Modal Design Pattern
- Use `catchtap` on modal content to prevent bubbling to overlay
- Use `bindtap` on overlay for close action
- Animation: CSS `@keyframes slideUp` for smooth entrance

### Star Rating Component
- Array `[1, 2, 3, 4, 5]` for rendering stars
- Click to set rating: `data-rating` attribute
- Visual feedback: `class="star-item {{rating >= item ? 'active' : ''}}"`
- Rating labels: 1=非常不满意, 2=不满意, 3=一般, 4=满意, 5=非常满意

### Evaluation Business Rules
- Only `completed` orders can be evaluated
- Check `order.evaluation` to prevent duplicate evaluations
- Navigate back after successful submission

### Styling Conventions
- Use rpx units (responsive pixels) for all dimensions
- Gradients: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` for brand
- Cards: white background, 24rpx border-radius, subtle shadow
- Spacing: 20-40rpx between elements

### Image Preview
- Use `wx.previewImage()` API
- Pass `current` and `urls` parameters
- Prevent event bubbling with `catchtap`

## 2026-02-14: Admin Homepage Implementation

### Admin Page Structure
- Path: `pages/admin/admin.{js,wxml,wxss,json}`
- Consistent with student page patterns but with admin-specific features

### Key Features Implemented
1. **Admin Access Control**: `checkAdminAccess()` verifies `userInfo.role === 'admin'`
2. **Pending Orders Count**: Fetches from `GET /admin/orders/pending`, counts array length
3. **Navigation Grid**: 2x2 grid layout to 4 admin functions
4. **Pull-to-refresh**: Updates user info and pending count
5. **Logout**: Clears storage and redirects to login

### API Integration
- Endpoint: `GET /admin/orders/pending`
- Uses `request.js` helper: `get('/admin/orders/pending')`
- Response: `{ code: 200, data: [...] }` - count from `data.length`

### Navigation Targets
- `/pages/admin-pending/admin-pending` - Pending orders
- `/pages/admin-completed/admin-completed` - Completed orders  
- `/pages/admin-announcements/admin-announcements` - Announcements
- `/pages/admin-evaluations/admin-evaluations` - Evaluations

### Design Patterns
- Same warm minimalist theme as student pages
- Admin header uses deeper brown tones for authority feel
- Stats card with prominent pending count (border highlight)
- 2x2 grid for 4 navigation items
- Red badge for pending count indicators

### Security
- Role check on `onLoad` and `onShow`
- Redirects non-admin users to index with toast message
- Uses `wx.reLaunch` to clear page stack

## 2026-02-14: Admin Order Processing Pages Implementation

### Admin Pending Orders Page (pages/admin-pending/)
**Files**: `admin-pending.js`, `admin-pending.wxml`, `admin-pending.wxss`, `admin-pending.json`

#### Features Implemented
1. **Pending Orders List**: Displays all pending and processing orders
2. **Order Card Display**: Shows repair type, building/room, contact phone, description
3. **Status-Based Actions**:
   - `pending` status: "接单" button → calls `PUT /admin/orders/:id/accept`
   - `processing` status: "完成报修" button → opens completion modal
4. **Order Detail Modal**: Full order information with images
5. **Completion Modal**: Image upload (max 3) with preview and removal
6. **Pull-to-refresh**: Refreshes order list

#### API Endpoints Used
```javascript
GET /admin/orders/pending          // Fetch all pending/processing orders
PUT /admin/orders/:id/accept       // Accept order (pending → processing)
PUT /admin/orders/:id/complete     // Complete order with completionImageUrls
POST /upload/completion            // Upload completion proof images
```

#### Completion Flow
1. Admin clicks "完成报修" on processing order
2. Modal opens for image upload
3. `wx.chooseImage` selects images (compressed)
4. `wx.uploadFile` uploads to `/upload/completion` endpoint
5. URLs collected in `completionImages` array
6. Submit calls `PUT /admin/orders/:id/complete` with image URLs
7. On success: close modal, refresh list, show toast

#### Key Implementation Details
- `catchtap` on action buttons to prevent card click (event bubbling)
- Status colors: pending (orange), processing (blue), completed (green)
- Repair type emojis mapped for visual identification
- Image preview with `wx.previewImage`
- Loading states for upload and submission

### Admin Completed Orders Page (pages/admin-completed/)
**Files**: `admin-completed.js`, `admin-completed.wxml`, `admin-completed.wxss`, `admin-completed.json`

#### Features Implemented
1. **Date Range Filter**: Start date and end date pickers (default: last 30 days)
2. **Order List**: Filtered completed orders
3. **Evaluation Display**: Shows rating stars and evaluation status
4. **Order Detail Modal**: Full order with completion images and evaluation

#### Date Filter Pattern
```javascript
// Default: last 30 days
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

// Query API with date range
GET /admin/orders?startDate=2024-01-01&endDate=2024-12-31
```

#### Evaluation Display
- Star rating with filled/empty stars based on `evaluation.rating`
- Rating labels: 1=非常不满意, 2=不满意, 3=一般, 4=满意, 5=非常满意
- Comment display if exists
- "未评价" badge for orders without evaluation

#### Modal Sections
1. Order status badge (large)
2. Order details (type, location, contact, description)
3. Original repair images
4. Completion proof images
5. Timestamps (created, completed)
6. Evaluation section (if exists)

### Common Patterns

#### Modal Animation
```css
.modal { opacity: 0; visibility: hidden; transition: all 0.3s; }
.modal.show { opacity: 1; visibility: visible; }
.modal-content { transform: translateY(100%); transition: transform 0.3s; }
.modal.show .modal-content { transform: translateY(0); }
```

#### Status Badge Styling
```css
.status-badge.pending { background: #fff7e6; color: #f5a623; }
.status-badge.processing { background: #e6f2ff; color: #4a90d9; }
.status-badge.completed { background: #e8f5e0; color: #7ed321; }
```

#### Image Upload Pattern
```javascript
// 1. Choose images
wx.chooseImage({ count: remainCount, sizeType: ['compressed'], ... })

// 2. Upload each file
wx.uploadFile({
  url: 'http://localhost:3000/api/upload/completion',
  filePath: filePath,
  name: 'image',
  header: { 'Authorization': `Bearer ${token}` }
})

// 3. Parse response and collect URLs
const data = JSON.parse(res.data);
if (data.code === 200) uploadedUrls.push(...data.data.urls);
```

### Design Decisions
- Purple gradient theme (`#667eea` to `#764ba2`) for brand consistency
- Card-based layout with subtle shadows and rounded corners
- Modal slides up from bottom (WeChat native feel)
- Emoji icons for quick visual identification of repair types
- Loading spinners for async operations
- Empty states with helpful messaging

## 2026-02-14: Admin Pages Implementation - Announcements & Evaluations

### Admin Announcements Page Patterns
- Dark theme with gold accents (#c9a227) for admin authority feel
- Modal-based create/edit form with slide-up animation
- Delete confirmation via wx.showModal with confirmColor for danger actions
- preventClose function to stop event bubbling in action buttons
- Character counter for textarea (500 max)

### Admin Evaluations Page Patterns
- Warm earthy palette (#6b4c3d, #8b6f5c, #d4a574) consistent with student pages
- Star rating display with color-coded badges per rating level
- Filter tabs for rating filtering (1-5 stars + all)
- Statistics bar showing total, positive (4+), and 5-star counts
- Detail modal with full content view

### API Integration Patterns
- GET /announcements - Public, no auth (for listing)
- POST /announcements/admin - Requires admin auth
- PUT /announcements/admin/:id - Update, requires admin auth  
- DELETE /announcements/admin/:id - Delete, requires admin auth
- GET /evaluations/admin - List all evaluations, requires admin auth

### WeChat Mini-Program Modal Pattern
```javascript
// Modal state management
showModal: false,
modalType: 'create', // or 'edit'
currentAnnouncement: null,

// Open modal
this.setData({ showModal: true, modalType: 'create' });

// Close modal
this.setData({ showModal: false });

// Prevent close when clicking content
catchtap="preventClose" on modal container
```

### Form Validation Pattern
- Check empty strings with .trim()
- Show toast for validation errors
- Set submitting state to prevent duplicate submissions
- Disable submit button during submission

### Star Rating Display
```wxml
<text class="star {{index < rating ? 'filled' : ''}}" wx:for="[1,2,3,4,5]">★</text>
```

### Rating Color Coding
- 5 stars: Green (#28a745)
- 4 stars: Blue (#007bff)
- 3 stars: Yellow/Orange (#f5a623)
- 2 stars: Orange/Red (#e67e22)
- 1 star: Red (#dc3545)

### Delete Confirmation Pattern
```javascript
wx.showModal({
  title: '确认删除',
  content: '确定要删除吗？此操作不可恢复。',
  confirmColor: '#e74c3c', // Red for danger
  success: (res) => {
    if (res.confirm) {
      // Perform delete
    }
  }
});
```

## 2026-02-14: App.js Route Mounting and Documentation

### App.js Structure Pattern
```javascript
// 1. Imports
const express = require('express');
// ... middleware imports

// 2. App configuration
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 3. Static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 4. Routes (mounted in logical order)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
// ... other routes

// 5. Health check (before error handlers)
app.get('/health', (req, res) => { ... });

// 6. Error handling middleware (4 parameters)
app.use((err, req, res, next) => { ... });

// 7. 404 handler (catches all unmatched routes)
app.use((req, res) => { ... });

// 8. Server start
app.listen(PORT, () => { ... });
```

### Middleware Order Importance
- Health check must come BEFORE 404 handler
- 404 handler catches ALL unmatched requests
- Error handler must have 4 parameters (err, req, res, next) for Express to recognize it

### Route Mounting
All 7 routes mounted:
1. `/api/auth` - Authentication (login, register)
2. `/api/user` - User profile
3. `/api/orders` - Student repair orders
4. `/api/admin` - Admin operations
5. `/api/upload` - File uploads
6. `/api/evaluations` - Service evaluations
7. `/api/announcements` - System announcements

### README Documentation Structure
- Project overview and tech stack
- Directory structure diagram
- Installation steps (backend, database, environment)
- WeChat mini-program configuration
- Test accounts table
- API endpoint reference
- Feature list (student/admin)
- Development notes
- FAQ section

### Environment Variables
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dormitory_repair
PORT=3000
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```
