import { useParams, useSearchParams } from "react-router-dom";
import TeacherDashboard from "./TeacherDashboard";
import StudentView from "./StudentView";

// Route handler: decides teacher vs student view based on query param
const MeetingRoom = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");

  if (role === "teacher") {
    return <TeacherDashboard />;
  }
  return <StudentView />;
};

export default MeetingRoom;
