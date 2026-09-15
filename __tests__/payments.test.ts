import { PaywallController } from '../src/payments/paywallController';
import { mockPurchaseService } from '../src/mock/mockPurchaseService';
import { mockBillingBackend } from '../src/mock/mockBillingBackend';
import { purchaseStore } from '../src/storage/purchaseStore';
import { resetAllState } from '../test-helpers/testUtils';

const PRODUCT = 'fan_monthly_subscription' as const;

describe('paid access', () => {
  beforeEach(resetAllState);

  test('a successful purchase does not grant access until the backend confirms it (delayed confirmation)', async () => {
    const controller = new PaywallController(PRODUCT);
    await controller.hydrate();
    expect(controller.getState()).toEqual({ status: 'idle', entitled: false });

    const purchasing = controller.purchase(undefined, { purchaseDelayMs: 30, confirmDelayMs: 120 });
    expect(controller.getState().status).toBe('purchasing');

    await new Promise((r) => setTimeout(r, 60));
    expect(controller.getState().status).toBe('purchased_pending_confirmation');
    expect(controller.getState().entitled).toBe(false);
    expect(await mockBillingBackend.isEntitled(PRODUCT)).toBe(false);

    await purchasing;
    expect(controller.getState().status).toBe('confirmed');
    expect(controller.getState().entitled).toBe(true);
    expect(await mockBillingBackend.isEntitled(PRODUCT)).toBe(true);
  });

  test('the mock store and the mock backend are genuinely separate stores', async () => {
    const record = await mockPurchaseService.purchase(PRODUCT, 'success', 1);
    expect(await mockBillingBackend.isEntitled(PRODUCT)).toBe(false);

    await mockBillingBackend.confirmPurchase(PRODUCT, record.purchaseToken, 1);
    expect(await mockBillingBackend.isEntitled(PRODUCT)).toBe(true);
  });

  test('repeated taps never start a second purchase flow for the same product', async () => {
    const spy = jest.spyOn(mockPurchaseService, 'purchase');
    const controller = new PaywallController(PRODUCT);
    await controller.hydrate();

    const first = controller.purchase(undefined, { purchaseDelayMs: 20, confirmDelayMs: 20 });
    const second = controller.purchase(undefined, { purchaseDelayMs: 20, confirmDelayMs: 20 });
    await Promise.all([first, second]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('confirmed');
    spy.mockRestore();
  });

  test('mockPurchaseService itself de-dupes concurrent purchases of the same product', async () => {
    const [a, b] = await Promise.all([
      mockPurchaseService.purchase(PRODUCT, 'success', 5),
      mockPurchaseService.purchase(PRODUCT, 'success', 5),
    ]);
    expect(a.purchaseToken).toBe(b.purchaseToken);
    expect(await purchaseStore.all()).toHaveLength(1);
  });

  test('a failed purchase attempt does not revoke an existing valid entitlement', async () => {
    const controller = new PaywallController(PRODUCT);
    await controller.hydrate();
    await controller.purchase(undefined, { purchaseDelayMs: 1, confirmDelayMs: 1 });
    expect(controller.getState().entitled).toBe(true);

    await controller.purchase('failed', { purchaseDelayMs: 1, confirmDelayMs: 1 });
    expect(controller.getState().entitled).toBe(true);
    expect(controller.getState().status).toBe('confirmed');
  });

  test('a cancelled purchase attempt does not revoke an existing valid entitlement', async () => {
    const controller = new PaywallController(PRODUCT);
    await controller.hydrate();
    await controller.purchase(undefined, { purchaseDelayMs: 1, confirmDelayMs: 1 });

    await controller.purchase('cancelled', { purchaseDelayMs: 1, confirmDelayMs: 1 });
    expect(controller.getState().entitled).toBe(true);
    expect(controller.getState().status).toBe('confirmed');
  });

  test('repeated backend confirmations for the same token never create duplicate effects', async () => {
    const record = await mockPurchaseService.purchase(PRODUCT, 'success', 1);
    const first = await mockBillingBackend.confirmPurchase(PRODUCT, record.purchaseToken, 1);
    const second = await mockBillingBackend.confirmPurchase(PRODUCT, record.purchaseToken, 1);
    expect(second.confirmedAt).toBe(first.confirmedAt);
  });

  test('restore instantly reflects an existing, already-confirmed purchase', async () => {
    const setup = new PaywallController(PRODUCT);
    await setup.hydrate();
    await setup.purchase(undefined, { purchaseDelayMs: 1, confirmDelayMs: 1 });

    const freshController = new PaywallController(PRODUCT);
    await freshController.restore();
    expect(freshController.getState()).toMatchObject({ status: 'confirmed', entitled: true });
  });

  test('restore fails clearly when there is nothing to restore', async () => {
    const controller = new PaywallController(PRODUCT);
    await controller.hydrate();
    await controller.restore();
    expect(controller.getState().status).toBe('failed');
    expect(controller.getState().entitled).toBe(false);
    expect(controller.getState().error).toMatch(/no previous purchase/i);
  });
});
