"use client";

import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { io } from "socket.io-client";

const Cam = () => {
  const [message, setMessage] = useState("");
  const sendNotification = () => {
    const socket = io("http://localhost:3001");
    socket.emit("notifyUser");
    toast({
      title: "Success",
      description: "Notification Sent",
    });
  };

  return (
    <div>
      <div>
        <p>Admin Page</p>
      </div>
      <div>
        <button onClick={sendNotification}>Notify All Users</button>
      </div>
    </div>
  );
};

export default Cam;
