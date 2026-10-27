-- Editor ko content.delete do — typical CMS mein editor apna/team content hata sakta hai.
-- (Strict companies mein sirf admin delete karta hai — learning ke liye editor OK)

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'editor'
  AND p.key = 'content.delete'
ON CONFLICT DO NOTHING;
