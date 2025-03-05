# 🚀 QuizKraft AI

**QuizKraft AI** allows users to effortlessly generate quizzes from **lecture screenshots** or **PDF files**. The app provides flexible export options, allowing users to save quizzes as **PDF** or **Word documents**, with or without answers. Users can customize the number of questions per type and adjust the difficulty level (**Easy, Medium, or Hard**).

### ✅ Supported Question Types:

- **Multiple-Choice**
- **Short-Answer**
- **Exam Problem**

---

## 🌐 Deployment (Firebase)

**QuizKraft AI** is hosted on **Firebase**, leveraging several services for seamless functionality:

- **Hosting**: Serves the built **React** frontend.
- **Cloud Functions**: Handles **OCR** and **quiz generation** logic.
- **Firestore & Storage**: Manages user data and uploaded files.
- **Authentication**: Supports user **sign-up, login, and email verification**.

### 🔧 Manual Deployment Steps

1. **Clone the Repository & Install Dependencies**

   ```bash
   git clone https://github.com/akouta/quizkraft-ai.git
   cd quizkraft-ai/frontend
   npm install
   npm run build
   ```

2. **Setup Firebase Functions**

   ```bash
   cd quizkraft-ai/functions
   npm install
   ```

3. **Configure Environment Variables**

   - Create an `.env` file in both the **frontend** and **functions** directories.

   **Frontend `.env` Example:**

   ```bash
   REACT_APP_FIREBASE_API_KEY="your-api-key"
   REACT_APP_FIREBASE_AUTH_DOMAIN="your-auth-domain"
   REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
   REACT_APP_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
   REACT_APP_FIREBASE_APP_ID="your-app-id"
   REACT_APP_FUNCTION_URL=https://your-cloud-function-url
   ```

   **Functions `.env` Example:**

   ```bash
   OPENAI_API_KEY="your-openai-api-key"
   ```

   > ⚠️ **Important:** Never commit `.env` files. Ensure they are in `.gitignore`.

4. **Set Up Firebase Configuration**

   - Copy the example Firebase config:

   ```bash
   cp .firebaserc.example .firebaserc
   ```

   - Replace the project ID in `.firebaserc`:

   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     }
   }
   ```

5. **Deploy to Firebase**

   ```bash
   firebase deploy --only hosting,functions,firestore,storage
   ```

   - Ensure `firebase.json` and `.firebaserc` are correctly configured.
   - If using CI/CD (e.g., GitHub Actions), confirm **Firebase tokens or service accounts** are set up for automatic deployments.

---

## 🛣️ Roadmap

We aim to make **QuizKraft AI** a **comprehensive tool for educators**. Here’s what’s coming next:

### 🎯 Short-Term Goals (1-2 Months)

- **UI/UX Enhancements**:
  - Improved layout and **progress bars** for uploads & quiz generation.
  - Enhanced **table and image extraction** from PDFs.
- **Performance Boost**:
  - Optimize **OCR & PDF processing** using parallelism and serverless functions.

### 📈 Medium-Term Goals (3-6 Months)

- **Interactive Quiz Mode**:
  - Users can **take quizzes online with auto-grading**.
- **Content Insights**:
  - Provide detailed **quiz coverage & alignment analytics**.
- **Math Parsing Enhancements**:
  - Improve handling of **LaTeX equations and diagrams**.

### 🚀 Long-Term Goals (6-12 Months)

- **Multi-Language Support**:
  - Generate quizzes in **multiple languages**.
- **LMS Integration**:
  - Export quizzes to platforms like **Moodle or Canvas**.
- **Gamification**:
  - Add **badges, leaderboards, and scoring systems**.
- **Subscription Tiers**:
  - Introduce **Freemium, Premium, Pro, and Enterprise plans**.
  - Implement **Stripe integration** for seamless payments & subscription management.

### ✅ Completed Features

- Generate quizzes from **PDFs & lecture screenshots**.
- Export quizzes as **PDF/Word** (with or without answers).

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

Enjoy using **QuizKraft AI**! 🚀 Have suggestions or feedback? Feel free to **open an issue or submit a pull request**. 🤝
