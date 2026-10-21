/** @jest-environment node */
import { EventEmitter } from "events";

jest.mock("amqplib", () => {
  const connect = jest.fn();
  return { __esModule: true, default: { connect }, connect };
});

type FakeChannel = EventEmitter & {
  assertExchange: jest.Mock;
  publish: jest.Mock;
};

function fakeModel(confirmError: Error | null = null) {
  const ch = new EventEmitter() as FakeChannel;
  ch.assertExchange = jest.fn().mockResolvedValue(undefined);
  ch.publish = jest.fn((_ex, _rk, _body, _opts, cb) => cb(confirmError));
  const model = new EventEmitter() as EventEmitter & {
    createConfirmChannel: jest.Mock;
    close: jest.Mock;
  };
  model.createConfirmChannel = jest.fn().mockResolvedValue(ch);
  model.close = jest.fn().mockResolvedValue(undefined);
  return { model, ch };
}

function load() {
  jest.resetModules();
  const amqp = require("amqplib").default as { connect: jest.Mock };
  const lib = require("./rabbitmq") as typeof import("./rabbitmq");
  return { amqp, lib };
}

describe("libs/rabbitmq", () => {
  it("chamadas concorrentes partilham uma só ligação", async () => {
    const { amqp, lib } = load();
    amqp.connect.mockResolvedValue(fakeModel().model);
    await Promise.all([lib.connectRabbitMQ(), lib.connectRabbitMQ()]);
    expect(amqp.connect).toHaveBeenCalledTimes(1);
  });

  it("volta a ligar depois de a conexão fechar", async () => {
    const { amqp, lib } = load();
    const first = fakeModel();
    const second = fakeModel();
    amqp.connect.mockResolvedValueOnce(first.model).mockResolvedValueOnce(second.model);

    await lib.connectRabbitMQ();
    first.model.emit("close");
    const ch = await lib.connectRabbitMQ();

    expect(amqp.connect).toHaveBeenCalledTimes(2);
    expect(ch).toBe(second.ch);
  });

  it("publishCommand espera confirmação e envia TTL e messageId", async () => {
    const { amqp, lib } = load();
    const { model, ch } = fakeModel();
    amqp.connect.mockResolvedValue(model);

    await lib.publishCommand("realwear_03", { message_id: "m1", op_id: "1" });

    const [exchange, routingKey, , options] = ch.publish.mock.calls[0];
    expect(exchange).toBe("gde.commands");
    expect(routingKey).toBe("realwear_03");
    expect(options).toMatchObject({ persistent: true, expiration: "60000", messageId: "m1" });
  });

  it("publishCommand falha quando o broker recusa", async () => {
    const { amqp, lib } = load();
    amqp.connect.mockResolvedValue(fakeModel(new Error("nack")).model);
    await expect(lib.publishCommand("realwear_03", { op_id: "1" })).rejects.toThrow("nack");
  });
});
