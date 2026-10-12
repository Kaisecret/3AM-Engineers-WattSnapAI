# Chat routing and conversation highlights

The user's requested behavior is Gemini first for every online turn, including the first suggested question and bill edits. TinyBERT and exact keyword parsing answer offline and when the Gemini request fails. A cached offline document must not force local replies after the connection returns. The network request itself confirms reachability; an offline browser skips it. Existing confirmation cards remain the only way to save changes.

Keep the current chat layout, header, composer and mascot. Improve the conversation with calm blue emphasis, teal peso highlights, blue energy highlights, clearer paragraph/list spacing, and compact source labels. Use accessible colors in both themes. Render supported text formatting through React elements, with no raw HTML or arbitrary model links.

The screenshot's missing-receipt requests must become pending bill entry, never an answer about an old bill. Preserve the requested amount through month/year and kWh clarification. Require an explicit year and actual consumption before proposing a bill; never derive missing kWh from the amount. Improve named-period comparison questions using actual saved records.

Validate online routing, reconnecting cached shells, failures, history, offline clarification and safe rendering with regression tests. Inspect mobile conversation screenshots in light and dark themes. Run the production build and disconnected browser test before deploying the updated conversation.
