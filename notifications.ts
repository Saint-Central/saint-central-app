// Function to trigger the ministry-notifications edge function
async function triggerNotificationsEdgeFunction(): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "ministry-notifications",
      {
        method: "POST",
        body: {
          source: "app",
          ministryId: ministryId,
        },
      }
    );

    if (error) {
      console.error("Error triggering notifications edge function:", error);
    } else {
      console.log("Notifications edge function triggered:", data);
    }
  } catch (error) {
    console.error("Exception triggering notifications edge function:", error);
  }
}

/**
 * Handle ministry messages notifications
 */
async function handleMinistryMessages(ministryId = null) {
  debug.log(
    ministryId
      ? `Checking for messages in ministry ID: ${ministryId}`
      : "Checking for unsent ministry messages"
  );

  try {
    // Begin building the query
    let query = supabase
      .from("ministry_messages")
      .select("id, ministry_id, user_id, message_text, sent_at");

    // Filter by ministry ID if provided
    if (ministryId) {
      query = query.eq("ministry_id", ministryId);
      // Get the most recent 5 messages regardless of push_sent status
      query = query.order("sent_at", { ascending: false }).limit(5);
    } else {
      // Otherwise get unsent messages
      query = query
        .eq("push_sent", false)
        .order("sent_at", { ascending: false })
        .limit(50);
    }

    // Execute the query
    const { data: messages, error } = await query;

    if (error) {
      // If push_sent column doesn't exist, try to create it
      if (
        error.message.includes("column") &&
        error.message.includes("push_sent")
      ) {
        debug.log("push_sent column might not exist, attempting to add it");

        try {
          // Execute SQL to add the column
          await supabase.rpc("execute_sql", {
            sql: "ALTER TABLE ministry_messages ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false",
          });

          debug.log("Added push_sent column, retrying query");

          // Try again without push_sent filter since we just added it
          const { data: retryMessages, error: retryError } = await supabase
            .from("ministry_messages")
            .select("id, ministry_id, user_id, message_text, sent_at")
            .order("sent_at", { ascending: false })
            .limit(50);

          if (retryError) {
            debug.error(
              "Error fetching messages after adding column",
              retryError
            );
            return {
              processed: 0,
              errors: ["Could not query messages even after adding column"],
            };
          }

          if (!retryMessages || retryMessages.length === 0) {
            debug.log("No unsent ministry messages found");
            return {
              processed: 0,
              errors: [],
            };
          }

          messages = retryMessages;
        } catch (e) {
          debug.error("Error adding push_sent column", e);
          return {
            processed: 0,
            errors: ["Could not add push_sent column. Please add it manually."],
          };
        }
      } else {
        debug.error("Error fetching ministry messages", error);
        return {
          processed: 0,
          errors: ["Error fetching ministry messages"],
        };
      }
    }

    if (!messages || messages.length === 0) {
      debug.log("No messages found to process");
      return {
        processed: 0,
        errors: [],
      };
    }

    debug.log(`Found ${messages.length} messages to process`);

    // Rest of the code remains the same...
  } catch (error) {
    console.error("Error handling ministry messages:", error);
    return {
      processed: 0,
      errors: ["Error handling ministry messages"],
    };
  }
}

// Main handler function for the edge function
const handler = async (req) => {
  try {
    let body = {};

    // Check for request body
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON
    }

    // Extract ministryId from the request body if available
    const ministryId = body.ministryId || null;

    // Process messages for specific ministry if provided, otherwise process all unsent messages
    const messageResult = await handleMinistryMessages(ministryId);

    // Only process notifications if we're not targeting a specific ministry
    const notificationResult = ministryId
      ? { processed: 0, errors: [] }
      : await handleMinistryNotifications();

    const totalProcessed =
      messageResult.processed + notificationResult.processed;
    const allErrors = [...messageResult.errors, ...notificationResult.errors];

    // Create the response with debug info
    return new Response(
      JSON.stringify({
        success: allErrors.length === 0,
        message: `Ministry notifications processed: ${totalProcessed} successful, ${allErrors.length} errors`,
        details: {
          messages: {
            processed: messageResult.processed,
            errors: messageResult.errors,
          },
          notifications: {
            processed: notificationResult.processed,
            errors: notificationResult.errors,
          },
        },
        debug: {
          messages: debug.messages,
          errors: debug.errors,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    debug.error("Error in main handler", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing notifications: ${error.message}`,
        debug: {
          messages: debug.messages,
          errors: debug.errors,
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
