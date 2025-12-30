# How to Configure Firebase

To make the authentication and database work, you need to update the `.env` file with your specific Firebase project configuration.

## Step 1: Get Config from Firebase Console

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click on your project (or create one if you haven't).
3.  On the project overview page, click the **Gear icon** (⚙️) next to "Project Overview" in the top-left sidebar and select **Project settings**.
4.  Scroll down to the **"Your apps"** section.
5.  If you haven't added a web app yet, click the **Web icon (`</>`)** to create one. Register it (you can ignore Firebase Hosting for now).
6.  Select your app and look for the **SDK setup and configuration** section.
7.  Select the **"Config"** radio button (not "npm" or "CDN").
8.  You will see a code snippet like this:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project",
      storageBucket: "your-project.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };
    ```

## Step 2: Format for `.env`

You need to convert that JavaScript object into a **single-line JSON string**.

**The easy way:**
1.  Copy just the object part (between `{` and `}`).
2.  Make sure keys typically have quotes in JSON (though our code parser might be lenient, valid JSON demands quotes like `"apiKey": "..."`).
3.  Remove all newlines so it fits on one line.

**Example Transformation:**

*From:*
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "example.firebaseapp.com"
}
```

*To:*
```text
{"apiKey":"AIzaSy...","authDomain":"example.firebaseapp.com"}
```

## Step 3: Update `.env`

1.  Open the file called `.env` in your project folder.
2.  Find the line starting with `VITE_FIREBASE_CONFIG=`.
3.  Replace the placeholder values with your JSON string.

It should look like this (all on one line):
```properties
VITE_FIREBASE_CONFIG={"apiKey":"AIzaSy...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

4.  **Save** the file.
5.  Restart your development server if it's running:
    - Press `Ctrl+C` in the terminal.
    - Run `npm run dev` again.
