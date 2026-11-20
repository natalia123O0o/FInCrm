'use strict';
const STATES = Object.freeze(['ACTIVE', 'INACTIVE', 'BLOCKED']);
function effectiveUserStatus(user) {
  if (!user) return 'INACTIVE';
  if (STATES.includes(user.status)) {
    // Un registro inconsistente nunca se reactiva de forma implícita.
    if (user.status === 'ACTIVE' && user.isActive === false) return 'INACTIVE';
    return user.status;
  }
  if (user.status != null) return 'INACTIVE';
  const wasDefaulted = !user.isNew && typeof user.$isDefault === 'function' && user.$isDefault('isActive');
  return user.isActive === true && !wasDefaulted ? 'ACTIVE' : 'INACTIVE';
}
function activeUserFilter(tenantId) {
  return {
    tenantId,
    role: { $in: ['ADMIN', 'USER'] },
    $or: [
      { status: 'ACTIVE', isActive: { $ne: false } },
      { status: { $exists: false }, isActive: true },
      { status: null, isActive: true },
    ],
  };
}
function publicUser(user) {
  const status = effectiveUserStatus(user);
  return {
    _id: user._id, id: user._id, name: user.name, email: user.email,
    role: user.role, tenantId: user.tenantId, status, isActive: status === 'ACTIVE',
    emailVerified: Boolean(user.emailVerifiedAt), lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt, updatedAt: user.updatedAt, __v: user.__v || 0,
  };
}
module.exports = { STATES, effectiveUserStatus, activeUserFilter, publicUser };
