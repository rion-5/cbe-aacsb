// src/lib/utils/admin.ts

import { query } from '$lib/server/db';
export async function isAdmin(user_id: string): Promise<boolean> {
    try {
        const sql = `
            SELECT 1
            FROM admin_users
            WHERE user_id = $1
            LIMIT 1;
        `;
        const result = await query(sql, [user_id]);
        return result.length > 0;
    } catch (error) {
        console.error('isAdmin Error:', error);
        return false;
    }
}

