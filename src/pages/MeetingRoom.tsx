import { useParams, useSearchParams } from "react-router-dom";
import TeacherDashboard from "./TeacherDashboard";
import StudentView from "./StudentView";

const MeetingRoom = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "student";
  const pid = searchParams.get("pid");

  if (!meetingId) return <p className="text-center text-destructive">Invalid meeting.</p>;
  if (role === "teacher") return <TeacherDashboard meetingId={meetingId} />;
  return <StudentView meetingId={meetingId} participantId={pid || ""} />;
};

export default MeetingRoom;
