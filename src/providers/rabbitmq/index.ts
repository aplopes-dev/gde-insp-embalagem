import RabbitmqServer from "@/lib/rabbitmq-server";

const server = new RabbitmqServer(`${process.env.RABBITMQ_URL}`);
export default server;
