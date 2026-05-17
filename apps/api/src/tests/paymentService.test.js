import test from "node:test";
import assert from "node:assert/strict";
import esmock from "esmock";

// ── Mock Stripe ──────────────────────────────────────────────
// Simulates Stripe behaviour so tests never touch the network.
class MockStripe {
  get paymentIntents() {
    return {
      create: async (params) => {
        // Replicate Stripe validation
        if (params.amount === undefined || Number.isNaN(params.amount)) {
          throw new Error("Missing required param: amount.");
        }
        if (params.amount <= 0) {
          throw new Error(
            "Invalid positive integer: amount must be a positive integer."
          );
        }
        // Successful response
        return {
          id: "pi_test_123456",
          client_secret: "cs_test_a1b2c3d4e5f6",
        };
      },
    };
  }
}

// ── Dynamically load the service with our mock ──────────────
/** @type {import("../services/paymentService.js").createPaymentIntent} */
let createPaymentIntent;

test("setup mock", async () => {
  const mod = await esmock(
    "../services/paymentService.js",
    { stripe: { default: MockStripe } }
  );
  createPaymentIntent = mod.createPaymentIntent;
});

// ── Test cases ───────────────────────────────────────────────

test("正常支付返回 clientSecret 和 paymentId", async () => {
  const result = await createPaymentIntent({
    amount: 49.99,
    currency: "usd",
  });

  assert.equal(result.paymentId, "pi_test_123456");
  assert.equal(result.client_secret, "cs_test_a1b2c3d4e5f6");
  assert.equal(result.amount, 49.99);
  assert.equal(result.currency, "usd");
  assert.equal(result.provider, "stripe");
});

test("amount 缺失报错", async () => {
  await assert.rejects(
    () => createPaymentIntent({ currency: "usd" }),
    /Payment processing failed/
  );
});

test("amount 为 0 报错", async () => {
  await assert.rejects(
    () => createPaymentIntent({ amount: 0, currency: "usd" }),
    /Payment processing failed/
  );
});

test("amount 为负数报错", async () => {
  await assert.rejects(
    () => createPaymentIntent({ amount: -10, currency: "usd" }),
    /Payment processing failed/
  );
});
