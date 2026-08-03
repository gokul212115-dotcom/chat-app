import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
const firebaseConfig = {
    apiKey: "AIzaSyB7DFFC-QNugr7Q0VmpQCtk4N48FZo3_ZU",
    authDomain: "chat-app-f95aa.firebaseapp.com",
    projectId: "chat-app-f95aa",
    storageBucket: "chat-app-f95aa.firebasestorage.app",
    messagingSenderId: "263578979043",
    appId: "1:263578979043:web:a6b2d3d18b3611a22a93d6",
    measurementId: "G-B25T6GK55X"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
//# sourceMappingURL=firebase.js.map