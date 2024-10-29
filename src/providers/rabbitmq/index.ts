import RabbitmqServer from "@/lib/rabbitmq";

const server = new RabbitmqServer(`${process.env.RABBITMQ_URL}`);
export default server;
