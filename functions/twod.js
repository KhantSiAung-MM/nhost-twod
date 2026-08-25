import fetch from 'node-fetch';

export default async function handler(req, res) {
  const HASURA_GRAPHQL_URL = process.env.NHOST_GRAPHQL_URL;
  const HASURA_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

  try {
    const apiRes = await fetch('https://htayapi.com/mm-twod/thai/2dlive?key=demoapi');
    const apiData = await apiRes.json();

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const yangonTime = new Date(utc + (3600000 * 6.5));
    const todayDate = yangonTime.toISOString().split('T')[0];

    const updateLiveQuery = `
      mutation UpdateLive($id: Int8!, $set: String, $val: String, $live: String, $m: String, $mi: String, $mm: String, $e: String, $ei: String, $em: String) {
        update_thailand_2d_live_by_pk(
          pk_columns: {id: $id},
          _set: {set: $set, val: $val, live: $live, m: $m, mi: $mi, mm: $mm, e: $e, ei: $ei, em: $em, updated_at: "now()"}
        ) {
          id
        }
      }
    `;

    await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query: updateLiveQuery,
        variables: {
          id: 0,
          set: apiData.live?.set || '',
          val: apiData.live?.val || '',
          live: apiData.live?.live || '',
          m: apiData.morning?.['2d'] || '',
          mi: apiData.morning?.internet || '',
          mm: apiData.morning?.modern || '',
          e: apiData.evening?.['2d'] || '',
          ei: apiData.evening?.internet || '',
          em: apiData.evening?.modern || ''
        }
      })
    });

    const updateHistoryQuery = `
      mutation UpsertHistory($date: date!, $m: String, $e: String) {
        insert_thailand_2d_history_one(
          object: {date: $date, m: $m, e: $e},
          on_conflict: {constraint: thailand_2d_history_pkey, update_columns: [m, e]}
        ) {
          date
        }
      }
    `;

    await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query: updateHistoryQuery,
        variables: {
          date: todayDate,
          m: apiData.morning?.['2d'] || '',
          e: apiData.evening?.['2d'] || ''
        }
      })
    });

    return res.status(200).json({ success: true, message: "Data updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
