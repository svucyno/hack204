import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Protected from "./components/Protected";
import ChatWidget from "./components/ChatWidget";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import SkillAssessment from "./pages/SkillAssessment";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import TopicDetail from "./pages/TopicDetail";
import Chatbot from "./pages/Chatbot";
import AdminDashboard from "./pages/AdminDashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/onboarding"
            element={
              <Protected>
                <Onboarding />
              </Protected>
            }
          />
          <Route
            path="/assessment"
            element={
              <Protected>
                <SkillAssessment />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/roadmap"
            element={
              <Protected>
                <Roadmap />
              </Protected>
            }
          />
          <Route
            path="/topic/:topicId"
            element={
              <Protected>
                <TopicDetail />
              </Protected>
            }
          />
          <Route
            path="/chat"
            element={
              <Protected>
                <Chatbot />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected admin>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/reports"
            element={
              <Protected>
                <Reports />
              </Protected>
            }
          />
          <Route
            path="/settings"
            element={
              <Protected>
                <Settings />
              </Protected>
            }
          />
        </Route>
      </Routes>
      <ChatWidget />
    </>
  );
}
