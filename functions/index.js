const functions = require("firebase-functions/v1");
const nodemailer = require("nodemailer");

// ══════════════════════════════════════
//  EMAIL TRANSPORTER
// ══════════════════════════════════════
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
}

const ADMIN_EMAIL = "sesnyanthony@gmail.com";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}


// ══════════════════════════════════════
//  1. CLIENT UPLOADS A DOCUMENT
//     → Email YOU
// ══════════════════════════════════════
exports.onDocumentUploaded = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("documents/{docId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const clientId = data.clientId;

    // Get client name from Firestore
    const clientDoc = await snap.ref.firestore.collection("clients").doc(clientId).get();
    const client = clientDoc.exists ? clientDoc.data() : null;
    const clientName = client ? `${client.firstName} ${client.lastName}` : "A client";

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Sesny Advisory" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `📄 ${clientName} uploaded a document`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">New Document Uploaded</h2>
          <p style="color: #666; margin-bottom: 24px;">A client has uploaded a new document to their portal.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px;"><strong>Client:</strong> ${clientName}</p>
            <p style="margin: 0 0 8px;"><strong>File:</strong> ${data.fileName || "Unknown"}</p>
            <p style="margin: 0 0 8px;"><strong>Size:</strong> ${data.fileSize || "—"}</p>
            <p style="margin: 0;"><strong>Uploaded:</strong> ${formatTime(data.uploadedAt)}</p>
          </div>
          <a href="https://cpa-site-pied.vercel.app/dashboard.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View in Dashboard →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Sesny Advisory · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Email sent to admin: ${clientName} uploaded ${data.fileName}`);
  });


// ══════════════════════════════════════
//  2. CLIENT SENDS A MESSAGE
//     → Email YOU
// ══════════════════════════════════════
exports.onClientMessage = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("messages/{msgId}")
  .onCreate(async (snap) => {
    const data = snap.data();

    // Only trigger for client messages, not admin messages
    if (data.senderRole !== "client") return null;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Sesny Advisory" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `💬 New message from ${data.senderName || "a client"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">New Client Message</h2>
          <p style="color: #666; margin-bottom: 24px;">A client sent you a message through the portal.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px;"><strong>From:</strong> ${data.senderName || "Unknown"}</p>
            <p style="margin: 0 0 16px;"><strong>Sent:</strong> ${formatTime(data.timestamp)}</p>
            <div style="background: #f5f5f3; border-radius: 8px; padding: 16px; font-size: 15px; color: #333; line-height: 1.6;">
              "${data.text || ""}"
            </div>
          </div>
          <a href="https://cpa-site-pied.vercel.app/dashboard.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reply in Dashboard →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Sesny Advisory · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Email sent to admin: message from ${data.senderName}`);
    return null;
  });


// ══════════════════════════════════════
//  3. YOU SEND CLIENT A MESSAGE
//     → Email THE CLIENT
// ══════════════════════════════════════
exports.onAdminMessage = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("messages/{msgId}")
  .onCreate(async (snap) => {
    const data = snap.data();

    // Only trigger for admin messages
    if (data.senderRole !== "admin") return null;

    const clientId = data.clientId;
    const clientDoc = await snap.ref.firestore.collection("clients").doc(clientId).get();
    if (!clientDoc.exists) return null;

    const client = clientDoc.data();
    const clientEmail = client.email;
    const clientFirst = client.firstName || "there";

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Anthony Sesny CPA" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `💬 You have a new message from Anthony`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${clientFirst},</h2>
          <p style="color: #666; margin-bottom: 24px;">Anthony sent you a message through your client portal.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <div style="background: #f5f5f3; border-radius: 8px; padding: 16px; font-size: 15px; color: #333; line-height: 1.6;">
              "${data.text || ""}"
            </div>
          </div>
          <a href="https://cpa-site-pied.vercel.app/portal.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View in Portal →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Anthony Sesny CPA · (718) 612-5911 · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Email sent to client ${clientEmail}: admin message`);
    return null;
  });


// ══════════════════════════════════════
//  4. YOU REQUEST A DOCUMENT
//     → Email THE CLIENT
// ══════════════════════════════════════
exports.onDocumentRequested = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("documentRequests/{reqId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const clientId = data.clientId;

    const clientDoc = await snap.ref.firestore.collection("clients").doc(clientId).get();
    if (!clientDoc.exists) return null;

    const client = clientDoc.data();
    const clientEmail = client.email;
    const clientFirst = client.firstName || "there";

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Anthony Sesny CPA" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `📋 Anthony needs a document from you`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${clientFirst},</h2>
          <p style="color: #666; margin-bottom: 24px;">Anthony has requested a document to continue working on your return.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Document Needed</p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">${data.documentName}</p>
          </div>
          <p style="color: #666; margin-bottom: 24px;">Please log in to your portal and upload this document at your earliest convenience.</p>
          <a href="https://cpa-site-pied.vercel.app/portal.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Upload Document →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Anthony Sesny CPA · (718) 612-5911 · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Email sent to client ${clientEmail}: document requested ${data.documentName}`);
    return null;
  });


// ══════════════════════════════════════
//  5. CLIENT STATUS CHANGES
//     → Email THE CLIENT
// ══════════════════════════════════════
exports.onStatusChanged = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("clients/{clientId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Only fire if status actually changed
    if (before.status === after.status) return null;

    // Don't email for pending status
    if (after.status === "pending") return null;

    const clientEmail = after.email;
    const clientFirst = after.firstName || "there";

    const statusMessages = {
      "in-progress": {
        subject: "🚀 Anthony has started working on your return",
        heading: "Your Return Is In Progress",
        body: "Great news — Anthony has started working on your tax return. We'll keep you updated as things progress."
      },
      "review": {
        subject: "🔍 Your return is under review",
        heading: "Your Return Is Under Review",
        body: "Anthony is currently reviewing your tax return. If anything else is needed, you'll hear from him shortly."
      },
      "filed": {
        subject: "🎉 Your tax return has been filed!",
        heading: "Your Return Has Been Filed!",
        body: "Congratulations — your tax return has been successfully filed. Log in to your portal to view the details."
      }
    };

    const msg = statusMessages[after.status];
    if (!msg) return null;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Anthony Sesny CPA" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: msg.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${clientFirst},</h2>
          <h3 style="color: #0A66C2; margin-bottom: 16px;">${msg.heading}</h3>
          <p style="color: #666; margin-bottom: 24px; line-height: 1.7;">${msg.body}</p>
          <a href="https://cpa-site-pied.vercel.app/portal.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Your Portal →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Anthony Sesny CPA · (718) 612-5911 · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Email sent to ${clientEmail}: status changed to ${after.status}`);
    return null;
  });


// ══════════════════════════════════════
//  6. NEW CLIENT REGISTERS
//     → Email YOU
// ══════════════════════════════════════
exports.onClientRegistered = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("clients/{clientId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Sesny Advisory" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🆕 New client registration: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">New Client Registration</h2>
          <p style="color: #666; margin-bottom: 24px;">A new client has registered and is waiting for your approval.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${data.email || "—"}</p>
            <p style="margin: 0;"><strong>Phone:</strong> ${data.phone || "—"}</p>
          </div>
          <p style="color: #666; margin-bottom: 24px;">Log in to your dashboard and go to the <strong>Clients</strong> tab to approve or deny this registration.</p>
          <a href="https://cpa-site-pied.vercel.app/dashboard.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Review in Dashboard →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Sesny Advisory</p>
        </div>
      `,
    });

    console.log(`Registration email sent to admin: ${name}`);
    return null;
  });


// ══════════════════════════════════════
//  7. CLIENT GETS APPROVED
//     → Welcome email to CLIENT
// ══════════════════════════════════════
exports.onClientApproved = functions
  .runWith({ secrets: ["GMAIL_USER", "GMAIL_PASSWORD"] })
  .firestore.document("clients/{clientId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Only fire when approvalStatus changes to "approved"
    if (before.approvalStatus === after.approvalStatus) return null;
    if (after.approvalStatus !== "approved") return null;

    const clientEmail = after.email;
    const clientFirst = after.firstName || "there";

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Anthony Sesny CPA" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `✅ Your Sesny Advisory account has been approved!`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${clientFirst}, you're all set!</h2>
          <p style="color: #666; margin-bottom: 24px; line-height: 1.7;">Your Sesny Advisory client portal account has been approved. You can now log in to upload documents, track your return, and message Anthony directly.</p>
          <div style="background: #fff; border: 1px solid #e5e4e0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-weight: 600;">What you can do in your portal:</p>
            <p style="margin: 0 0 6px; color: #666;">📄 Upload tax documents securely</p>
            <p style="margin: 0 0 6px; color: #666;">📊 Track your return status in real time</p>
            <p style="margin: 0 0 6px; color: #666;">💬 Message Anthony directly</p>
            <p style="margin: 0; color: #666;">📋 View your assigned tax forms</p>
          </div>
          <a href="https://cpa-site-pied.vercel.app/portal.html" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Log In to Your Portal →</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Anthony Sesny CPA · (718) 612-5911 · sesnyanthony@gmail.com</p>
        </div>
      `,
    });

    console.log(`Welcome email sent to approved client: ${clientEmail}`);
    return null;
  });

// ══════════════════════════════════════
//  8. JOURNAL ENTRY WRITTEN
//     → Server-side balance validation
//     Fires on create and update
// ══════════════════════════════════════
exports.onJournalEntryWritten = functions
  .firestore.document("journalEntries/{entryId}")
  .onWrite(async (change, context) => {
    // If deleted, do nothing
    if (!change.after.exists) return null;

    const data = change.after.data();

    // Only validate posted entries — drafts are allowed to be unbalanced
    if (data.status === "draft") return null;

    const lines = data.lines || [];
    const totalDr = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
    const totalCr = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDr - totalCr) < 0.01;

    // Build the update payload
    const update = {
      isBalanced,
      integrityCheckedAt: functions.firestore.Timestamp ? undefined : null,
    };

    // Use admin Firestore timestamp
    const admin = require("firebase-admin");
    if (!admin.apps.length) admin.initializeApp();
    update.integrityCheckedAt = admin.firestore.FieldValue.serverTimestamp();

    if (!isBalanced) {
      update.integrityError = `Unbalanced entry: DR $${totalDr.toFixed(2)} ≠ CR $${totalCr.toFixed(2)}. Difference: $${Math.abs(totalDr - totalCr).toFixed(2)}.`;
    } else {
      update.integrityError = null;
    }

    // Only write if something actually changed — prevents infinite trigger loops
    const noChange = data.isBalanced === isBalanced && !data.integrityError === !update.integrityError;
    if (noChange) return null;

    return change.after.ref.update(update);
  });


// ══════════════════════════════════════
//  9. CLIENT DELETED
//     → Cascade delete all related data
// ══════════════════════════════════════
exports.onClientDeleted = functions
  .firestore.document("clients/{clientId}")
  .onDelete(async (snap, context) => {
    const clientId = context.params.clientId;
    const admin = require("firebase-admin");
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();

    // Collections with a top-level clientId field
    const flatCollections = [
      "journalEntries",
      "financialStatements",
      "documents",
      "messages",
      "activity",
      "documentRequests",
      "assignedForms",
      "savedForms",
      "clientReturns",
    ];

    const deleteQueryBatch = async (query) => {
      const snap = await query.get();
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    };

    // Delete all flat-collection documents where clientId matches
    await Promise.all(
      flatCollections.map(col =>
        deleteQueryBatch(db.collection(col).where("clientId", "==", clientId))
      )
    );

    // Delete clientLedger subcollections (periods + fixedAssets)
    const ledgerRef = db.collection("clientLedger").doc(clientId);
    const subCollections = ["periods", "fixedAssets"];
    await Promise.all(
      subCollections.map(async (sub) => {
        const subSnap = await ledgerRef.collection(sub).get();
        if (subSnap.empty) return;
        const batch = db.batch();
        subSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      })
    );

    // Delete the clientLedger root document itself
    await ledgerRef.delete().catch(() => {});

    console.log(`Cascade delete complete for client: ${clientId}`);
    return null;
  });
