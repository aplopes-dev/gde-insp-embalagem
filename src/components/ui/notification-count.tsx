import { Badge } from "./badge";

export default function NotificationCount({ count: count }: { count: number }) {
  return (
    <Badge className="absolute h-5 w-5 rounded-full top-[-10px] right-[-10px] flex justify-center">
      {count}
    </Badge>
  );
}
