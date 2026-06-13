/**
 * Audit Logger Middleware & Service
 * Records all AI agent actions and human overrides to the audit log
 * and creates corresponding ledger (blockchain) entries
 */

const { query } = require('../db/pool');
const { createLedgerEntry } = require('../services/ledger');

/**
 * Write an audit log entry
 * @param {Object} params
 * @param {string} params.agent - Agent name (monitor, diagnostic, etc.)
 * @param {string} params.action - Action description
 * @param {string} [params.actorId] - Human actor user ID (if applicable)
 * @param {string} [params.targetId] - Target entity ID
 * @param {string} [params.targetType] - Target entity type
 * @param {Object} [params.details] - Additional details
 * @param {string} [params.policyVersion] - Policy version
 * @param {string} [params.ipAddress] - IP address
 */
const writeAuditLog = async ({
  agent,
  action,
  actorId = null,
  targetId = null,
  targetType = null,
  details = {},
  policyVersion = '1.0.0',
  ipAddress = null,
}) => {
  try {
    const { rows } = await query(
      `INSERT INTO audit_logs 
        (agent, action, actor_id, target_id, target_type, details, policy_version, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [agent, action, actorId, targetId, targetType, JSON.stringify(details), policyVersion, ipAddress]
    );

    // Create a ledger entry for significant AI actions
    const significantActions = [
      'content_generated', 'plan_created', 'plan_approved', 'plan_rejected',
      'content_approved', 'content_rejected', 'alert_triggered', 'override_applied'
    ];

    if (significantActions.some(a => action.includes(a))) {
      await createLedgerEntry({
        recordType: 'audit_action',
        referenceId: rows[0].id,
        metadata: { agent, action, targetType },
      });
    }

    return rows[0].id;
  } catch (err) {
    // Audit logging should never crash the main flow
    console.error('[AUDIT] Failed to write audit log:', err.message);
    return null;
  }
};

/**
 * Express middleware to log HTTP requests for sensitive routes
 */
const auditMiddleware = (agent, action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400) {
        await writeAuditLog({
          agent,
          action,
          actorId: req.user?.id,
          targetId: req.params?.id,
          details: { method: req.method, path: req.path, body: req.body },
          ipAddress: req.ip,
        });
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { writeAuditLog, auditMiddleware };
