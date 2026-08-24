// mBELLAb Operations Portal — Cloudflare Worker (Supabase backend)
// Drop-in replacement for mbb-enquiry-proxy — identical API contract, Supabase storage.

const SUPABASE_URL = 'https://wflcmaygrbpuxerikijm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNtYXlncmJwdXhlcmlraWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzU2MjA1MywiZXhwIjoyMTAzMTM4MDUzfQ.1_Ziz05z7A0sB_IZENdKLjq8YAu-NKx-EnVQcBtRzmA';
// RESEND_API_KEY is set as a Cloudflare Worker Secret (not hardcoded)
const NOTIFY_EMAIL = 'paul.winick@mbellab.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
};

// ── Supabase helpers ──────────────────────────────────────────────

const SB_HEADERS = {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type':'application/json',
};

async function sbQuery(table, filter = '') {
  const qs  = filter ? `select=*&${filter}` : 'select=*';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body:    JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

async function sbUpdate(table, id, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:  'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body:    JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] ?? null;
}

async function sbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:  'DELETE',
    headers: SB_HEADERS,
  });
  if (!res.ok) throw new Error(await res.text());
  return {};
}

// ── User cache (5-min TTL, same as original Worker) ───────────────

let usersCache     = null;
let usersCacheTime = 0;
const CACHE_TTL    = 5 * 60 * 1000;

async function getUsers() {
  const now = Date.now();
  if (usersCache && (now - usersCacheTime) < CACHE_TTL) return usersCache;
  try {
    const rows = await sbQuery('users', 'active=eq.true');
    if (rows.length) { usersCache = rows; usersCacheTime = now; }
  } catch {}
  return usersCache || [];
}

function bustCache() { usersCache = null; }

// ── Field maps ────────────────────────────────────────────────────
// Scalar: Airtable field name → Supabase column name (bidirectional).
// Link:   Airtable field name → Supabase FK column.
//         GET returns links as [uuid] arrays; POST/PATCH takes first element.

const SCALAR = {
  projects: {
    'SR. No.':               'sr_no',
    'Enquiry Date':          'enquiry_date',
    'Name of Project':       'name',
    'Contractor':            'contractor',
    'Main Contractor':       'main_contractor',
    'Client':                'client',
    'RTU Substations':       'rtu_substations',
    'Status':                'status',
    'Proposal Submitted On': 'proposal_submitted_on',
    'Quotation':             'quotation',
    'Technical Proposal':    'technical_proposal',
    'LPO (Client)':          'lpo_client',
    'LPO (MBB to Supplier)': 'lpo_mbb_to_supplier',
    'RFQ Entries':           'rfq_entries',
    'Last_Update':           'last_update',
    'Deadline':              'deadline',
    'Active':                'active',
    'Docs':                  'docs',
    'Awarded To':            'awarded_to',
    'Awarded Price':         'awarded_price',
    'Loss Reason':           'loss_reason',
  },
  activity_log: {
    'Name':   'name',
    'Date':   'date',
    'Note':   'note',
    'Author': 'author',
    'Type':   'type',
  },
  bidders: {
    'Name':     'name',
    'Comments': 'comments',
    'Status':   'status',
  },
  quotes: {
    'Name':            'name',
    'Description':     'description',
    'Quote Amount':    'quote_amount',
    'Awarded Amount':  'awarded_amount',
    'Date Submitted':  'date_submitted',
    'Status':          'status',
    'Notes':           'notes',
    'SharePoint Link': 'sharepoint_link',
  },
  quote_items: {
    'QuoteId':     'airtable_quote_id',
    'SortOrder':   'sort_order',
    'Description': 'description',
    'Amount':      'amount',
    'Quantity':    'quantity',
  },
  invoices: {
    'Name':            'name',
    'Invoice Number':  'invoice_number',
    'Amount':          'amount',
    'Date':            'date',
    'Status':          'status',
    'Notes':           'notes',
    'SharePoint Link': 'sharepoint_link',
  },
  quality_objectives: {
    'Objective Number':     'objective_number',
    'Year':                 'year',
    'Department':           'department',
    'Objective':            'objective',
    'Status':               'status',
    'Start Date':           'start_date',
    'End Date':             'end_date',
    'Completion %':         'completion_pct',
    'Monitoring Frequency': 'monitoring_frequency',
    'Responsibility':       'responsibility',
    'Objective Steps':      'objective_steps',
  },
  po_received: {
    'Name':            'name',
    'PO Number':       'po_number',
    'Date':            'date',
    'Amount':          'amount',
    'Status':          'status',
    'SharePoint Link': 'sharepoint_link',
    'Notes':           'notes',
  },
  po_sent: {
    'Name':            'name',
    'PO Number':       'po_number',
    'Date':            'date',
    'Amount':          'amount',
    'Status':          'status',
    'SharePoint Link': 'sharepoint_link',
    'Notes':           'notes',
  },
  invoices_received: {
    'Name':            'name',
    'Invoice Number':  'invoice_number',
    'Date':            'date',
    'Amount':          'amount',
    'Status':          'status',
    'SharePoint Link': 'sharepoint_link',
    'Notes':           'notes',
  },
  vendor_equipment_pricing: {
    'Item':             'item',
    'Vendor':           'vendor',
    'Product Make':     'product_make',
    'Product Type':     'product_type',
    'Description':      'description',
    'Rate':             'rate',
    'Price':            'price',
    'Last Quoted Date': 'last_quoted_date',
    'Active':           'active',
  },
  contractors: {
    'Company Name':   'company_name',
    'Contact Name':   'contact_name',
    'Contact Number': 'contact_number',
    'Contact Email':  'contact_email',
    'Comments':       'comments',
    'Website':        'website',
    'Contacts JSON':  'contacts_json',
  },
  suppliers: {
    'Supplier Name':             'supplier_name',
    'Email':                     'email',
    'Contact Number':            'contact_number',
    'Contact Person':            'contact_person',
    'Approved Products/Services':'approved_products_services',
    'Website':                   'website',
    'Link to Evaluation':        'link_to_evaluation',
  },
  employees: {
    'Employee Name':                      'employee_name',
    'Date of Birth':                      'date_of_birth',
    'Passport Number':                    'passport_number',
    'Passport Expiry':                    'passport_expiry',
    'Link to Passport':                   'link_to_passport',
    'Emirates ID Number':                 'emirates_id_number',
    'Emirates ID Expiry':                 'emirates_id_expiry',
    'Link to Emirates ID':                'link_to_emirates_id',
    'Visa File Number':                   'visa_file_number',
    'Visa Expiry':                        'visa_expiry',
    'Link to Visa':                       'link_to_visa',
    'Health Insurance Policy Number':     'health_insurance_policy_number',
    'Health Insurance Membership Number': 'health_insurance_membership_number',
    'Link to Health Insurance Card':      'link_to_health_insurance_card',
    'Annual Leave Days':                  'annual_leave_days',
    'Sick Leave Days':                    'sick_leave_days',
    'Start Date':                         'start_date',
    'Username':                           'username',
  },
  users: {
    'Name':     'name',
    'Username': 'username',
    'Password': 'password',
    'Role':     'role',
    'Active':   'active',
  },
  role_permissions: {
    'Screen':   'screen',
    'Label':    'label',
    'Section':  'section',
    'Admin':    'admin',
    'Engineer': 'engineer',
    'Viewer':   'viewer',
    'Finance':  'finance',
  },
  renewals: {
    'Name':            'name',
    'Entity':          'entity',
    'Renewal Details': 'renewal_details',
    'Estimated Cost':  'estimated_cost',
    'Expiry Date':     'expiry_date',
    'Comments':        'comments',
    'Link to Steps':   'link_to_steps',
  },
  company_docs: {
    'Name':          'name',
    'Company':       'company',
    'Document Name': 'document_name',
    'Document Link': 'document_link',
    'Comments':      'comments',
  },
  petty_cash: {
    'Name':        'name',
    'Date':        'date',
    'Type':        'type',
    'Amount':      'amount',
    'Description': 'description',
    'VU No':       'vu_no',
    'Notes':       'notes',
    'Document':    'document',
  },
  passwords: {
    'Name':     'name',
    'Entity':   'entity',
    'Website':  'website',
    'Username': 'username',
    'Password': 'password',
    'Comments': 'comments',
    'Notes':    'notes',
  },
  leave_records: {
    'Name':       'name',
    'Start_Date': 'start_date',
    'End_Date':   'end_date',
    'Type':       'type',
    'Days':       'days',
    'Notes':      'notes',
  },
  leave_requests: {
    'Name':            'name',
    'Leave_Type':      'leave_type',
    'Date_Out':        'date_out',
    'Date_In':         'date_in',
    'Days':            'days',
    'Detail':          'detail',
    'Coverage':        'coverage',
    'Submission_Date': 'submission_date',
    'Status':          'status',
    'Approved_By':     'approved_by',
    'Approval_Date':   'approval_date',
    'Rejection_Notes': 'rejection_notes',
  },
  annual_tickets: {
    'Name':   'name',
    'Period': 'period',
    'Status': 'status',
    'Notes':  'notes',
  },
  bank_holidays: {
    'Name':      'name',
    'Date':      'date',
    'Confirmed': 'confirmed',
    'Status':    'status',
  },
  annual_entitlements: {
    'Name':         'name',
    'Period_Start': 'period_start',
    'Period_End':   'period_end',
    'Days':         'days',
    'Notes':        'notes',
  },
  payment_terms: {
    'Name':          'name',
    'Payment_Terms': 'payment_terms',
  },
  price_book: {
    'ItemCode':        'item_code',
    'Description':     'description',
    'Unit':            'unit',
    'UnitPrice':       'unit_price',
    'QuoteRef':        'quote_ref',
    'QuoteDate':       'quote_date',
    'OpportunityId':   'opportunity_airtable_id',
    'OpportunityName': 'opportunity_name',
    'Schedule':        'schedule',
    'Notes':           'notes',
  },
};

// Linked record fields (returned as [uuid] arrays in GET, first element stored in POST/PATCH)
const LINKS = {
  activity_log:             { 'Opportunity': 'project_id' },
  bidders:                  { 'Opportunity': 'project_id', 'Contractor': 'contractor_id' },
  quotes:                   { 'Opportunity': 'project_id' },
  invoices:                 { 'Opportunity': 'project_id' },
  quality_objectives:       { 'Opportunity': 'project_id' },
  po_received:              { 'Opportunity': 'project_id' },
  po_sent:                  { 'Opportunity': 'project_id' },
  invoices_received:        { 'Opportunity': 'project_id' },
  leave_records:            { 'Employee': 'employee_id' },
  leave_requests:           { 'Employee': 'employee_id' },
  annual_tickets:           { 'Employee': 'employee_id' },
  annual_entitlements:      { 'Employee': 'employee_id' },
  vendor_equipment_pricing: { 'Supplier': 'supplier_id' },
};

// ── Transform helpers ─────────────────────────────────────────────

function rowToRecord(sbTable, row) {
  const fields = {};
  for (const [atField, sbCol] of Object.entries(SCALAR[sbTable] || {})) {
    fields[atField] = row[sbCol] ?? null;
  }
  for (const [atField, sbCol] of Object.entries(LINKS[sbTable] || {})) {
    fields[atField] = row[sbCol] ? [row[sbCol]] : [];
  }
  return { id: row.id, fields };
}

function fieldsToRow(sbTable, airtableFields) {
  const row = {};
  for (const [atField, sbCol] of Object.entries(SCALAR[sbTable] || {})) {
    if (atField in airtableFields) {
      const v = airtableFields[atField];
      row[sbCol] = (v === '' || v === undefined) ? null : v;
    }
  }
  for (const [atField, sbCol] of Object.entries(LINKS[sbTable] || {})) {
    if (atField in airtableFields) {
      const v = airtableFields[atField];
      row[sbCol] = Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    }
  }
  return row;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── filterByFormula parser (quote-items only) ─────────────────────
// Handles: {QuoteId}='uuid' and OR({QuoteId}='uuid1',{QuoteId}='uuid2')
function parseQuoteFilter(formula) {
  const uuids = [...formula.matchAll(/'([^']+)'/g)].map(m => m[1]).filter(Boolean);
  if (!uuids.length) return '';
  return uuids.length === 1
    ? `airtable_quote_id=eq.${uuids[0]}`
    : `airtable_quote_id=in.(${uuids.join(',')})`;
}

// ── Generic CRUD handler ──────────────────────────────────────────

async function handleTable(method, sbTable, recordId, body, searchParams) {
  try {
    if (method === 'GET') {
      let filter = '';
      if (sbTable === 'quote_items') {
        const formula = searchParams.get('filterByFormula');
        if (formula) filter = parseQuoteFilter(formula);
      }
      const rows = await sbQuery(sbTable, recordId ? `id=eq.${recordId}` : filter);
      return json({ records: rows.map(r => rowToRecord(sbTable, r)) });
    }

    if (method === 'POST') {
      const row      = fieldsToRow(sbTable, body?.fields || {});
      const inserted = await sbInsert(sbTable, row);
      return json(rowToRecord(sbTable, inserted));
    }

    if (method === 'PATCH') {
      const row     = fieldsToRow(sbTable, body?.fields || {});
      const updated = await sbUpdate(sbTable, recordId, row);
      if (!updated) return json({ error: 'Record not found' }, 404);
      return json(rowToRecord(sbTable, updated));
    }

    if (method === 'DELETE') {
      await sbDelete(sbTable, recordId);
      return json({ deleted: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── Route table ───────────────────────────────────────────────────

const ROUTES = [
  { prefix: '/company-docs',        sbTable: 'company_docs'             },
  { prefix: '/petty-cash',          sbTable: 'petty_cash'               },
  { prefix: '/renewals',            sbTable: 'renewals'                 },
  { prefix: '/employees',           sbTable: 'employees'                },
  { prefix: '/quality-objectives',  sbTable: 'quality_objectives'       },
  { prefix: '/invoices-received',   sbTable: 'invoices_received'        },
  { prefix: '/invoices',            sbTable: 'invoices'                 },
  { prefix: '/po-received',         sbTable: 'po_received'              },
  { prefix: '/po-sent',             sbTable: 'po_sent'                  },
  { prefix: '/quotes',              sbTable: 'quotes'                   },
  { prefix: '/quote-items',         sbTable: 'quote_items'              },
  { prefix: '/bidders',             sbTable: 'bidders'                  },
  { prefix: '/activity',            sbTable: 'activity_log'             },
  { prefix: '/contractors',         sbTable: 'contractors'              },
  { prefix: '/vendor',              sbTable: 'vendor_equipment_pricing'  },
  { prefix: '/passwords',           sbTable: 'passwords'                },
  { prefix: '/leave-records',       sbTable: 'leave_records'            },
  { prefix: '/annual-tickets',      sbTable: 'annual_tickets'           },
  { prefix: '/bank-holidays',       sbTable: 'bank_holidays'            },
  { prefix: '/annual-entitlements', sbTable: 'annual_entitlements'      },
  { prefix: '/leave-requests',      sbTable: 'leave_requests'           },
  { prefix: '/price-book',          sbTable: 'price_book'               },
  { prefix: '/payment-terms',       sbTable: 'payment_terms'            },
];

// ── Renewals report ───────────────────────────────────────────────

async function sendRenewalsReport(RESEND_API_KEY) {
  const today  = new Date();
  const in90   = new Date(today); in90.setDate(today.getDate() + 90);
  const fmt    = d => d.toISOString().slice(0, 10);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/renewals?renewal_date=gte.${fmt(today)}&renewal_date=lte.${fmt(in90)}&order=renewal_date.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const rows = res.ok ? await res.json() : [];

  if (!rows.length) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'mBELLAb Portal <onboarding@resend.dev>',
        to:      [NOTIFY_EMAIL],
        subject: 'Daily Renewals Report — No upcoming renewals in next 90 days',
        html:    '<p>No renewals are due in the next 90 days.</p>',
      }),
    });
    return;
  }

  const daysDiff = d => Math.ceil((new Date(d) - today) / 86400000);

  const urgencyColor = days =>
    days <= 14 ? '#c0392b' : days <= 30 ? '#e67e22' : '#2980b9';

  const rows_html = rows.map(r => {
    const days  = daysDiff(r.renewal_date);
    const color = urgencyColor(days);
    const dateStr = r.renewal_date
      ? new Date(r.renewal_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    return `<tr>
      <td style="padding:6px 14px 6px 0;border-bottom:1px solid #eee">${r.item_name || '—'}</td>
      <td style="padding:6px 14px 6px 0;border-bottom:1px solid #eee">${r.supplier || '—'}</td>
      <td style="padding:6px 14px 6px 0;border-bottom:1px solid #eee">${dateStr}</td>
      <td style="padding:6px 0 6px 0;border-bottom:1px solid #eee;font-weight:700;color:${color}">${days}d</td>
    </tr>`;
  }).join('');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'mBELLAb Portal <onboarding@resend.dev>',
      to:      [NOTIFY_EMAIL],
      subject: `Daily Renewals Report — ${rows.length} renewal${rows.length > 1 ? 's' : ''} due in next 90 days`,
      html: `
        <p style="font-family:sans-serif">Good morning. Here are the renewals due in the next <strong>90 days</strong>.</p>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%;max-width:600px">
          <thead>
            <tr style="color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.5px">
              <th style="padding:4px 14px 8px 0;text-align:left;font-weight:600">Item</th>
              <th style="padding:4px 14px 8px 0;text-align:left;font-weight:600">Supplier</th>
              <th style="padding:4px 14px 8px 0;text-align:left;font-weight:600">Due Date</th>
              <th style="padding:4px 0 8px 0;text-align:left;font-weight:600">Days</th>
            </tr>
          </thead>
          <tbody>${rows_html}</tbody>
        </table>
        <p style="margin-top:16px"><a href="https://mbellab.github.io" style="color:#5c1f25;font-family:sans-serif">Open Portal →</a></p>
      `,
    }),
  });
}

// ── Main ──────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url    = new URL(request.url);
    const path   = url.pathname;
    const search = url.searchParams;

    // ── /auth ─────────────────────────────────────────────────────
    if (path === '/auth' && method === 'POST') {
      try {
        const { username, password } = await request.json();
        const users = await getUsers();
        const user  = users.find(r =>
          r.username?.toLowerCase() === username?.toLowerCase() &&
          r.password === password &&
          r.active === true
        );
        if (user) return json({ role: (user.role || '').toLowerCase(), name: user.name });
        return json({ error: 'Invalid username or password.' }, 401);
      } catch {
        return json({ error: 'Bad request.' }, 400);
      }
    }

    // ── Validate X-App-Password on every other request ────────────
    const sentPassword = request.headers.get('X-App-Password') || '';
    const users        = await getUsers();
    const validUser    = users.find(r => r.password === sentPassword && r.active === true);
    if (!validUser) return json({ error: 'Unauthorised' }, 401);
    const validRole = (validUser.role || '').toLowerCase();

    // Parse body for mutating methods
    let body = null;
    if (['POST', 'PATCH'].includes(method)) {
      try { body = await request.json(); } catch {}
    }

    // ── /users — admin only ───────────────────────────────────────
    if (path === '/users' || path.startsWith('/users/')) {
      if (validRole !== 'admin') return json({ error: 'Admin only' }, 403);
      if (['POST', 'PATCH', 'DELETE'].includes(method)) bustCache();
      const recordId = path.startsWith('/users/') ? path.slice(7) : null;
      return handleTable(method, 'users', recordId, body, search);
    }

    // ── /role-permissions — GET for all, write for admin ──────────
    if (path === '/role-permissions' || path.startsWith('/role-permissions/')) {
      if (method !== 'GET' && validRole !== 'admin') return json({ error: 'Admin only' }, 403);
      const recordId = path.startsWith('/role-permissions/') ? path.slice('/role-permissions/'.length) : null;
      return handleTable(method, 'role_permissions', recordId, body, search);
    }

    // ── /suppliers — with email notification on POST ─────────────
    if (path === '/suppliers' || path.startsWith('/suppliers/')) {
      const recordId = path.startsWith('/suppliers/') ? path.slice('/suppliers/'.length) : null;
      const result   = await handleTable(method, 'suppliers', recordId, body, search);
      if (method === 'POST' && result.status === 200 && env.RESEND_API_KEY) {
        const fields       = body?.fields || {};
        const supplierName = fields['Supplier Name'] || 'New Supplier';
        const contact      = fields['Contact Person'] || '';
        const products     = fields['Approved Products/Services'] || '';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    'mBELLAb Portal <onboarding@resend.dev>',
            to:      [NOTIFY_EMAIL],
            subject: `Action Required: Supplier Evaluation — ${supplierName}`,
            html: `
              <p>A new supplier has been added to the <strong>mBELLAb Operations Portal</strong>.</p>
              <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
                <tr><td style="padding:4px 12px 4px 0;color:#666">Supplier</td><td><strong>${supplierName}</strong></td></tr>
                ${contact  ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Contact</td><td>${contact}</td></tr>` : ''}
                ${products ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Products</td><td>${products}</td></tr>` : ''}
              </table>
              <p style="margin-top:16px">Please remember to <strong>create and file a Supplier Evaluation form</strong> for this supplier.</p>
              <p><a href="https://mbellab.github.io" style="color:#e36209">Open Portal →</a></p>
            `,
          }),
        });
      }
      return result;
    }

    // ── Named routes ──────────────────────────────────────────────
    for (const route of ROUTES) {
      if (path === route.prefix || path.startsWith(route.prefix + '/')) {
        const recordId = path.slice(route.prefix.length + 1) || null;
        return handleTable(method, route.sbTable, recordId, body, search);
      }
    }

    // ── Root → projects — with email notification on POST ────────
    const recordId = path.length > 1 ? path.slice(1) : null;
    const result   = await handleTable(method, 'projects', recordId, body, search);
    if (method === 'POST' && result.status === 200 && env.RESEND_API_KEY) {
      const fields  = body?.fields || {};
      const srNo    = fields['SR. No.']      || '';
      const client  = fields['Client']        || '';
      const desc    = fields['Description']   || '';
      const status  = fields['Status']        || '';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'mBELLAb Portal <onboarding@resend.dev>',
          to:      [NOTIFY_EMAIL],
          subject: `New Project Added${srNo ? ' — ' + srNo : ''}${client ? ' — ' + client : ''}`,
          html: `
            <p>A new project has been added to the <strong>mBELLAb Operations Portal</strong>.</p>
            <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
              ${srNo   ? `<tr><td style="padding:4px 12px 4px 0;color:#666">SR No.</td><td><strong>${srNo}</strong></td></tr>` : ''}
              ${client ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Client</td><td>${client}</td></tr>` : ''}
              ${desc   ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Description</td><td>${desc}</td></tr>` : ''}
              ${status ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Status</td><td>${status}</td></tr>` : ''}
            </table>
            <p><a href="https://mbellab.github.io" style="color:#5c1f25">Open Portal →</a></p>
          `,
        }),
      }).catch(() => {});
    }
    return result;
  },

  // ── Cron: daily renewals report ─────────────────────────────────
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendRenewalsReport(env.RESEND_API_KEY));
  },
};
