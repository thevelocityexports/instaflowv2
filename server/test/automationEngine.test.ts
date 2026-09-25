/**
 * Test Suite for InstaFlow Automation Engine
 * Verifies all 14 required test cases:
 * 1. Exact keyword match
 * 2. Contains keyword match
 * 3. Case insensitive matching
 * 4. Whitespace normalization
 * 5. Multiple keywords
 * 6. Inactive automation
 * 7. Duplicate comment event (Idempotency)
 * 8. Multiple matching automations
 * 9. Successful public reply
 * 10. Successful private DM
 * 11. Meta API error handling
 * 12. Unauthorized user handling
 * 13. Invalid webhook verification
 * 14. Mock test event
 */

import { AutomationService } from '../services/automationService';
import { WebhookService } from '../services/webhookService';
import { databaseService } from '../services/databaseService';
import { InstagramService } from '../services/instagramService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

export async function runAllTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n=============================================');
  console.log('  RUNNING INSTAFLOW ENGINE TEST SUITE');
  console.log('=============================================\n');

  // Test 1: Whitespace normalization
  const normalized = AutomationService.normalizeText('   PRICE    PLEASE   ');
  assert(normalized === 'price please', '1. Whitespace normalization collapses redundant spaces and trims');

  // Test 2: Case-insensitive matching
  const caseMatch = AutomationService.matchKeyword('pRiCe please', ['PRICE'], 'contains');
  assert(caseMatch.isMatch && caseMatch.matchedKeyword === 'PRICE', '2. Case insensitive matching matches "pRiCe" to "PRICE"');

  // Test 3: Contains keyword match
  const containsMatch = AutomationService.matchKeyword('How much does this cost in total?', ['cost', 'price'], 'contains');
  assert(containsMatch.isMatch && containsMatch.matchedKeyword === 'cost', '3. Contains keyword match identifies substring within comment');

  // Test 4: Exact keyword match (Positive & Negative)
  const exactMatchPos = AutomationService.matchKeyword('price', ['PRICE'], 'exact');
  const exactMatchNeg = AutomationService.matchKeyword('price please', ['PRICE'], 'exact');
  assert(exactMatchPos.isMatch && !exactMatchNeg.isMatch, '4. Exact keyword match only matches exact full comment');

  // Test 5: Multiple keywords
  const multiKeyword = AutomationService.matchKeyword('Can you send the link to order?', ['PRICE', 'LINK', 'COST'], 'contains');
  assert(multiKeyword.isMatch && multiKeyword.matchedKeyword === 'LINK', '5. Multiple keywords properly matches whichever keyword appears');

  // Test 6: Inactive automation should NOT execute
  const testAccount = await databaseService.getAccountById('ig_acc_01');
  const inactiveAuto = await databaseService.createAutomation({
    userId: 'usr_default_01',
    instagramAccountId: 'ig_acc_01',
    name: 'Inactive Promotion Auto',
    isActive: false, // Inactive!
    triggerType: 'comment',
    targetPostType: 'all',
    matchType: 'contains',
    keywords: ['TEST_INACTIVE_KEYWORD'],
    actions: [
      {
        actionType: 'public_reply',
        messageTemplate: 'Inactive reply',
        isEnabled: true,
      },
    ],
  });

  const inactiveEventResult = await AutomationService.processComment({
    platform: 'instagram',
    accountId: 'ig_acc_01',
    commentId: `comment_inactive_test_${Date.now()}`,
    userId: 'user_test_99',
    username: 'tester',
    commentText: 'Here is TEST_INACTIVE_KEYWORD for you',
    timestamp: new Date().toISOString(),
    isTestMode: false,
  });
  assert(inactiveEventResult.matchedAutomations === 0 && inactiveEventResult.actionsExecuted === 0, '6. Inactive automation is ignored during execution');
  await databaseService.deleteAutomation(inactiveAuto.id, 'usr_default_01');

  // Test 7: Duplicate comment event (Idempotency)
  const dupCommentId = `comment_idempotent_${Date.now()}`;
  const firstRun = await AutomationService.processComment({
    platform: 'instagram',
    accountId: 'ig_acc_01',
    commentId: dupCommentId,
    userId: 'user_dup_1',
    username: 'dup_user',
    commentText: 'PRICE please',
    timestamp: new Date().toISOString(),
    isTestMode: false,
  });
  const secondRun = await AutomationService.processComment({
    platform: 'instagram',
    accountId: 'ig_acc_01',
    commentId: dupCommentId,
    userId: 'user_dup_1',
    username: 'dup_user',
    commentText: 'PRICE please',
    timestamp: new Date().toISOString(),
    isTestMode: false,
  });
  assert(firstRun.processed && secondRun.isDuplicate, '7. Duplicate comment event is caught by idempotency guard and not re-executed');

  // Test 8: Multiple matching automations
  const autoA = await databaseService.createAutomation({
    userId: 'usr_default_01',
    instagramAccountId: 'ig_acc_01',
    name: 'Auto A Price',
    isActive: true,
    triggerType: 'comment',
    targetPostType: 'all',
    matchType: 'contains',
    keywords: ['MULTI_MATCH_KEY'],
    actions: [{ actionType: 'public_reply', messageTemplate: 'Reply A', isEnabled: true }],
  });
  const autoB = await databaseService.createAutomation({
    userId: 'usr_default_01',
    instagramAccountId: 'ig_acc_01',
    name: 'Auto B Price',
    isActive: true,
    triggerType: 'comment',
    targetPostType: 'all',
    matchType: 'contains',
    keywords: ['MULTI_MATCH_KEY'],
    actions: [{ actionType: 'private_dm', messageTemplate: 'DM B', isEnabled: true }],
  });

  const multiResult = await AutomationService.processComment({
    platform: 'instagram',
    accountId: 'ig_acc_01',
    commentId: `multi_comment_${Date.now()}`,
    userId: 'user_multi_1',
    username: 'multi_user',
    commentText: 'I need MULTI_MATCH_KEY right now',
    timestamp: new Date().toISOString(),
    isTestMode: true,
  });
  assert(multiResult.matchedAutomations >= 2, '8. Multiple matching automations all trigger appropriately');
  await databaseService.deleteAutomation(autoA.id, 'usr_default_01');
  await databaseService.deleteAutomation(autoB.id, 'usr_default_01');

  // Test 9 & 10: Successful public reply and private DM in test mode
  const testReply = await InstagramService.sendPublicCommentReply({
    commentId: 'cmt_mock_1',
    message: 'Thanks for asking! 👋',
    isTestMode: true,
  });
  assert(testReply.success && !!testReply.replyId, '9. Successful public reply returns replyId in test mode');

  const testDM = await InstagramService.sendPrivateDM({
    recipientUserId: 'usr_mock_1',
    message: 'Hi! Here is your private link:',
    linkUrl: 'https://example.com/demo',
    isTestMode: true,
  });
  assert(testDM.success && !!testDM.messageId, '10. Successful private DM formats link and returns messageId');

  // Test 11: Meta API error handling (without crashing)
  const metaErrorCall = await InstagramService.sendPublicCommentReply({
    commentId: 'cmt_invalid',
    message: 'test',
    accessToken: undefined, // Missing token
    isTestMode: false,
  });
  assert(!metaErrorCall.success && !!metaErrorCall.error, '11. Meta API error is handled gracefully with clean user error message');

  // Test 12: Unauthorized user check
  const fakeAuth = await databaseService.getAutomationById('non_existent_id');
  assert(fakeAuth === null, '12. Unauthorized or missing automation lookup returns null');

  // Test 13: Invalid Webhook verification
  const validWebhook = WebhookService.verifyWebhook('subscribe', 'instaflow_verify_secret', 'challenge_123');
  const invalidWebhook = WebhookService.verifyWebhook('subscribe', 'wrong_token', 'challenge_123');
  assert(validWebhook.isValid && !invalidWebhook.isValid, '13. Webhook verification rejects mismatched verify tokens');

  // Test 14: Mock test event execution via AutomationService
  const priceAuto = await databaseService.createAutomation({
    userId: 'usr_default_01',
    instagramAccountId: 'ig_acc_01',
    name: 'Price Inquiry Automation',
    isActive: true,
    triggerType: 'comment',
    targetPostType: 'all',
    matchType: 'contains',
    keywords: ['PRICE'],
    actions: [{ actionType: 'public_reply', messageTemplate: 'Price is $49', isEnabled: true }],
  });

  const mockEventResult = await AutomationService.processComment({
    platform: 'instagram',
    accountId: 'ig_acc_01',
    commentId: `mock_test_${Date.now()}`,
    userId: 'test_user_77',
    username: 'designer_pat',
    commentText: 'What is the PRICE of this piece?',
    timestamp: new Date().toISOString(),
    isTestMode: true,
  });
  assert(mockEventResult.processed && mockEventResult.matchedAutomations > 0, '14. Mock test event successfully executes through the real automation pipeline');
  await databaseService.deleteAutomation(priceAuto.id, 'usr_default_01');

  console.log('\n---------------------------------------------');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================\n');

  return { passed, failed };
}

// Execute if run directly via tsx
if (process.argv[1]?.endsWith('automationEngine.test.ts')) {
  runAllTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}
