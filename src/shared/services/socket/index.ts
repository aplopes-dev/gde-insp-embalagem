"use client"

import { io } from "socket.io-client";

const SOCKET_URL=`${process.env.NEXT_PUBLIC_SOCKET_URL}`

export const sendToIA = (data: any) => {
  const socket = io(SOCKET_URL);
  socket.emit("iaHandler", data);
};

export const sendDetectionReceived = (data: any) => {
  const socket = io(SOCKET_URL);
  socket.emit("iaHandler", data);
};