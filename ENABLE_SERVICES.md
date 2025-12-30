# Enable Firebase Services

The error `auth/configuration-not-found` (or similar) usually means the **Authentication Service** is not turned on yet. You also need to turn on the **Database**.

## 1. Enable Authentication (Fixing Login Error)

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click on your project **CHU-Game25C**.
3.  In the left sidebar, under **Build** (建構), click **Authentication**.
4.  Click **Get started** (開始使用).
5.  Click the **Sign-in method** tab (if not already there).
6.  Click **Email/Password** (電子郵件/密碼).
7.  Turn on the **Enable** (啟用) switch.
8.  Click **Save** (儲存).

## 2. Enable Database (For Saving Scores)

1.  In the left sidebar, under **Build** (建構), click **Firestore Database**.
2.  Click **Create database** (建立資料庫).
3.  Choose a location (e.g., `asia-east1` for Taiwan, or default is fine). Click **Next**.
4.  **Important**: Choose **Start in test mode** (以測試模式啟動).
    - This allows us to read/write data without complex rules for now.
5.  Click **Create** (建立).

## 3. Try Again
1.  Go back to your app.
2.  Refresh the page.
3.  Click "新球員？點此註冊" (Sign Up) since you don't have an account yet.
4.  Enter email and password and click the button.
