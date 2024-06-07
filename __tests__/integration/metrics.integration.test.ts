import express from "express";
import request from "supertest";
import healthRouter from "../../src/infrastructure/web/endpoints/metrics/health";

const app = express();

describe("Basic health test", () => {
	it("should return 200", async () => {
		app.use("/metrics/health", healthRouter);
		const res = await request(app).get("/metrics/health");
		expect(res.statusCode).toEqual(200);
	});
});
