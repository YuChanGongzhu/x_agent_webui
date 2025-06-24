const roomMsgListUrl = process.env.REACT_APP_GET_ROOM_MSG_LIST;
const roomListUrl = process.env.REACT_APP_GET_ROOM_LIST;
const roomMpListUrl = process.env.REACT_APP_GET_MP_ROOM_LIST;
const roomMpMsgListUrl = process.env.REACT_APP_GET_MP_ROOM_MSG_LIST;
const tokenUsageUrl = process.env.REACT_APP_GET_CHAT_TOKEN;
const getNoteUrl = process.env.REACT_APP_TECENT_GET_NOTES;
const getKeywordUrl = process.env.REACT_APP_TECENT_GET_KEYWORDS;
const getCommentsUrl = process.env.REACT_APP_TECENT_GET_COMMENTS;
const getCommentsKeywordUrl = process.env.REACT_APP_TECENT_GET_COMMENTS_KEYWORD;
const getIntentCustomersUrl = process.env.REACT_APP_TECENT_GET_INTENT_CUSTOMERS;
const getReplyTemplatesUrl = process.env.REACT_APP_TECENT_GET_REPLY_TEMPLATES;
const updateReplyTemplateUrl = process.env.REACT_APP_TECENT_UPDATE_REPLY_TEMPLATE;
const getXhsDevicesMsgListUrl = process.env.REACT_APP_TECENT_GET_XHS_DEVICES_MSG_LIST;

export interface ChatMessage {
  msg_id: string;
  wx_user_id: string;
  wx_user_name: string;
  room_id: string;
  room_name: string;
  sender_id: string;
  sender_name: string;
  msg_type: number;
  msg_type_name: string;
  content: string;
  msg_datetime: string;
}

export interface ChatMessagesResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: ChatMessage[];
  };
}

export const getChatMessagesApi = async (params: {
  room_id?: string;
  wx_user_id?: string;
  sender_id?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value.toString());
  });

  const response = await fetch(`${roomMsgListUrl}/messages?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat messages');
  }
  return response.json() as Promise<ChatMessagesResponse>;
};

export interface RoomListMessage {
  room_id: string;
  room_name: string;
  wx_user_id: string;
  wx_user_name: string;
  sender_id: string;
  sender_name: string;
  msg_id: string;
  msg_content: string;
  msg_datetime: string;
  msg_type: number;
  is_group: boolean;
}

export interface RoomListMessagesResponse {
  code: number;
  message: string;
  data: RoomListMessage[];
}

export const getRoomListMessagesApi = async (params: {
  wx_user_id?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params.wx_user_id) {
    queryParams.append('wx_user_id', params.wx_user_id);
  }

  const response = await fetch(`${roomListUrl}?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat messages');
  }
  return response.json() as Promise<RoomListMessagesResponse>;
};

export const getChatMpMessagesApi = async (params: {
  room_id?: string;
  wx_user_id?: string;
  sender_id?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value.toString());
  });

  const response = await fetch(`${roomMpMsgListUrl}/messages?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat MP messages');
  }
  return response.json() as Promise<ChatMessagesResponse>;
};

export const getRoomMpListMessagesApi = async (params: {
  wx_user_id?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params.wx_user_id) {
    queryParams.append('wx_user_id', params.wx_user_id);
  }

  const response = await fetch(`${roomMpListUrl}?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat MP room messages');
  }
  return response.json() as Promise<RoomListMessagesResponse>;
};

// Interface for WeChat Public Account room list items
export interface MpRoomListMessage {
  room_id: string;
  room_name: string;
  user_id: string;
  sender_id: string;
  sender_name: string;
  msg_id: string;
  msg_type: string; // Changed to string based on SQL schema
  msg_content: string;
  msg_datetime: string;
  is_group: boolean;
}

// Interface for WeChat Public Account chat messages
export interface MpChatMessage {
  msg_id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  msg_type: string;
  msg_content: string;
  msg_datetime: string;
}

export interface MpChatMessagesResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: MpChatMessage[];
    limit: number;
    offset: number;
  };
}

export interface MpRoomListResponse {
  code: number;
  message: string;
  data: MpRoomListMessage[];
}

/**
 * Fetches the list of WeChat public account chat sessions
 * Each session includes the latest message between a user and a public account
 * @param params Optional parameters
 * @param params.gh_user_id Optional public account ID to filter results
 */
export const getMpRoomListApi = async (params?: {
  gh_user_id?: string;
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.gh_user_id) {
      queryParams.append('gh_user_id', params.gh_user_id);
    }

    const baseUrl = roomMpListUrl || '';
    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch WeChat public account room list');
    }
    return response.json() as Promise<MpRoomListResponse>;
  } catch (error) {
    console.error('Error fetching WeChat public account room list:', error);
    throw error;
  }
};

/**
 * Fetches chat messages for WeChat public accounts
 * Supports two query methods:
 * 1. By room_id (format: gh_xxx@userid)
 * 2. By from_user_id and to_user_id separately
 *
 * @param params Query parameters for the chat messages
 * @returns Promise with the chat messages response
 */
export const getMpChatMessageApi = async (params: {
  room_id?: string;
  from_user_id?: string;
  to_user_id?: string;
  msg_type?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}) => {
  try {
    const queryParams = new URLSearchParams();

    // Add all provided parameters to the query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const baseUrl = roomMpMsgListUrl || '';
    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch WeChat public account chat messages');
    }

    return response.json() as Promise<MpChatMessagesResponse>;
  } catch (error) {
    console.error('Error fetching WeChat public account chat messages:', error);
    throw error;
  }
};

/**
 * Interface for token usage record
 */
export interface TokenUsageRecord {
  id: string;
  token_source_platform: string;
  wx_user_id: string;
  wx_user_name?: string;
  room_id?: string;
  room_name?: string;
  model_name?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  unit_price?: number;
  total_price?: number;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // For any other fields that might be returned
}

/**
 * Interface for token usage response
 */
export interface TokenUsageResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: TokenUsageRecord[];
    limit: number;
    offset: number;
  };
  sum: {
    sum_token: number;
    sum_price: string;
  };
}

/**
 * Retrieves token usage records with optional filtering
 */
/**
 * Interface for Xiaohongshu Note
 */
export interface XhsNote {
  id: string;
  note_id: string;
  title: string;
  desc: string;
  keyword: string;
  user_id: string;
  nickname: string;
  avatar: string;
  images: string;
  video_url?: string;
  like_count: number;
  collect_count: number;
  comment_count: number;
  share_count: number;
  created_time: string;
  updated_time: string;
  [key: string]: any; // For any other fields that might be returned
}

/**
 * Interface for Xiaohongshu Notes Response
 */
export interface XhsNotesResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: XhsNote[];
  } | null;
}

/**
 * Interface for Xiaohongshu Comment
 */
export interface XhsComment {
  id: string;
  note_id: string;
  note_url: string;
  user_id: string;
  nickname: string;
  avatar: string;
  content: string;
  like_count: number;
  created_time: string;
  keyword: string;
  [key: string]: any; // For any other fields that might be returned
}

/**
 * Interface for Xiaohongshu Comments Response
 */
export interface XhsCommentsResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: XhsComment[];
  } | null;
}

/**
 * Interface for Keywords Response
 */
export interface KeywordsResponse {
  code: number;
  message: string;
  data: string[];
}

/**
 * Retrieves all unique keywords from Xiaohongshu notes
 * @param email Optional email to filter keywords by user
 * @returns Promise with the keywords response
 */
export const getKeywordsApi = async (email?: string): Promise<KeywordsResponse> => {
  try {
    const baseUrl = getKeywordUrl || '';

    // Add email parameter to query if provided
    const url = email ? `${baseUrl}?email=${encodeURIComponent(email)}` : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch keywords');
    }

    return await response.json() as Promise<KeywordsResponse>;
  } catch (error) {
    console.error('Error fetching keywords:', error);
    throw error;
  }
};

/**
 * Retrieves Xiaohongshu comments filtered by a specific keyword
 * @param keyword The keyword to filter comments by
 * @param email Optional email to filter comments by user
 * @returns Promise with the comments response
 */
export const getXhsCommentsByKeywordApi = async (keyword: string, email?: string): Promise<XhsCommentsResponse> => {
  try {
    if (!keyword) {
      throw new Error('Missing required parameter: keyword');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('keyword', keyword);

    if (email) {
      queryParams.append('email', email);
    }

    const baseUrl = getCommentsUrl || '';
    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Xiaohongshu comments by keyword');
    }

    return await response.json() as Promise<XhsCommentsResponse>;
  } catch (error) {
    console.error('Error fetching Xiaohongshu comments by keyword:', error);
    throw error;
  }
};

/**
 * Interface for Customer Intent data
 */
export interface CustomerIntent {
  id: number;
  comment_id: string;
  keyword: string;
  author: string;
  intent: string;
  content: string;
  note_url: string;
  profile_sentence: string;
  analyzed_at: string;
  is_reply: string;
  [key: string]: any; // For any other fields that might be returned
}

/**
 * Interface for Customer Intent API response
 */
export interface CustomerIntentResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: CustomerIntent[];
    filters: {
      keywords: string[];
      intents: string[];
    };
  } | null;
}

/**
 * Retrieves customer intent data filtered by keyword and/or intent type
 * @param params Optional parameters for filtering
 * @param params.keyword Optional keyword to filter by
 * @param params.intent Optional intent type to filter by
 * @param params.email Optional email to filter by user
 * @returns Promise with the customer intent response
 */
export const getIntentCustomersApi = async (params?: {
  keyword?: string;
  intent?: string;
  get_keywords?: boolean;
  get_intents?: boolean;
  email?: string;
}): Promise<CustomerIntentResponse> => {
  try {
    const queryParams = new URLSearchParams();

    // Add optional filters to query parameters
    if (params?.keyword) {
      queryParams.append('keyword', params.keyword);
    }

    if (params?.intent) {
      queryParams.append('intent', params.intent);
    }

    // Add email filter if provided
    if (params?.email) {
      queryParams.append('email', params.email);
    }

    // Add flags for getting keywords or intents lists
    if (params?.get_keywords) {
      queryParams.append('get_keywords', 'true');
    }

    if (params?.get_intents) {
      queryParams.append('get_intents', 'true');
    }

    const baseUrl = getIntentCustomersUrl || '';
    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch customer intent data');
    }

    return await response.json() as Promise<CustomerIntentResponse>;
  } catch (error) {
    console.error('Error fetching customer intent data:', error);
    throw error;
  }
};

/**
 * Retrieves Xiaohongshu comments for specific note URLs
 * @param urls Array of note URLs to fetch comments for
 * @returns Promise with the comments response
 */
export const getXhsCommentsByUrlsApi = async (urls: string[]): Promise<XhsCommentsResponse> => {
  try {
    if (!urls || urls.length === 0) {
      throw new Error('Missing required parameter: urls');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('urls', JSON.stringify(urls));

    const baseUrl = getCommentsUrl || '';
    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Xiaohongshu comments by URLs');
    }

    return await response.json() as Promise<XhsCommentsResponse>;
  } catch (error) {
    console.error('Error fetching Xiaohongshu comments by URLs:', error);
    throw error;
  }
};

/**
 * Retrieves a limited number of Xiaohongshu comments
 * @param limit Maximum number of comments to retrieve (default: 100)
 * @returns Promise with the comments response
 */
export const getXhsCommentsApi = async (limit: number = 100): Promise<XhsCommentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());

    const baseUrl = getCommentsUrl || '';
    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Xiaohongshu comments');
    }

    return await response.json() as Promise<XhsCommentsResponse>;
  } catch (error) {
    console.error('Error fetching Xiaohongshu comments:', error);
    throw error;
  }
};

/**
 * Retrieves Xiaohongshu notes filtered by a specific keyword
 * @param keyword The keyword to filter notes by
 * @returns Promise with the notes response
 */
export const getXhsNotesByKeywordApi = async (keyword: string,email?: string): Promise<XhsNotesResponse> => {
  try {
    if (!keyword) {
      throw new Error('Missing required parameter: keyword');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('keyword', keyword);

    if (email) {
      queryParams.append('email', email);
    }

    const baseUrl = getNoteUrl || '';
    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Xiaohongshu notes');
    }

    return await response.json() as Promise<XhsNotesResponse>;
  } catch (error) {
    console.error('Error fetching Xiaohongshu notes:', error);
    throw error;
  }
};

export const getTokenUsageApi = async (params: {
  token_source_platform: string;
  wx_user_id: string;
  room_id?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}): Promise<TokenUsageResponse> => {
  try {
    if (!params || !params.token_source_platform) {
      throw new Error('Missing required parameter: token_source_platform');
    }

    if (!params.wx_user_id) {
      throw new Error('Missing required parameter: wx_user_id');
    }

    const queryParams = new URLSearchParams();

    queryParams.append('token_source_platform', params.token_source_platform);
    queryParams.append('wx_user_id', params.wx_user_id);

    if (params.room_id) queryParams.append('room_id', params.room_id);
    if (params.start_time) queryParams.append('start_time', params.start_time);
    if (params.end_time) queryParams.append('end_time', params.end_time);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const baseUrl = tokenUsageUrl || '';
    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch token usage records');
    }

    return await response.json() as TokenUsageResponse;
  } catch (error) {
    console.error('Error fetching token usage records:', error);
    throw error;
  }
};

const chatSummaryUrl = process.env.REACT_APP_GET_CHAT_SUMMARY;

export interface ChatHistorySummaryResponse {
  code: number;
  message: string;
  data: {
    metadata: {
      id: string;
      room_id: string;
      room_name: string;
      wx_user_id: string;
      time_range: {
        start: string;
        end: string;
      };
      message_count: number;
      created_at: string;
      updated_at: string;
    };
    summary: string;
    chat_key_event: Array<{
      time: string;
      event: string;
      detail: string;
    }>;
    tags: {
      基础信息: {
        name: string;
        contact: string;
        gender: string;
        age_group: string;
        city_tier: string;
        specific_location: string;
        occupation_type: string;
        marital_status: string;
        family_structure: string;
        income_level_estimated: string;
      };
      价值观与兴趣: {
        core_values: any;
        hobbies_interests: any;
        life_status_indicators: any;
        social_media_activity_level: string;
        info_acquisition_habits: any;
      };
      互动与认知: {
        acquisition_channel_type: string;
        acquisition_channel_detail: string;
        initial_intent: string;
        intent_details: string;
        product_knowledge_level: string;
        communication_style: string;
        current_trust_level: string;
        need_urgency: string;
      };
      购买决策: {
        core_need_type: string;
        budget_sensitivity: string;
        decision_drivers: any;
        main_purchase_obstacles: any;
        upsell_readiness: string;
      };
      客户关系: {
        past_satisfaction_level: string;
        customer_loyalty_status: string;
        repurchase_drivers: any;
        need_evolution_trend: string;
        engagement_level: string;
      };
      特殊来源: {
        partner_source_type: string;
        partner_name: string;
        partner_interest_focus: string;
        partner_conversion_obstacles: any;
      };
    };
  } | null;
}

/**
 * Fetches chat history summary for a specific WeChat user and room
 * 
 * @param wxid WeChat user ID
 * @param room_id Room ID
 * @returns Promise with the chat history summary response
 */
export const getWxChatHistorySummaryApi = async (wxid: string, room_id: string): Promise<ChatHistorySummaryResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('wx_user_id', wxid);
    queryParams.append('room_id', room_id);

    const baseUrl = chatSummaryUrl || '';
    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch chat history summary');
    }
    return response.json() as Promise<ChatHistorySummaryResponse>;
  } catch (error) {
    console.error('Error fetching chat history summary:', error);
    throw error;
  }
};

/**
 * Interface for Reply Template
 */
export interface ReplyTemplate {
  id: number;
  email: string; // Email of the user who owns the template
  content: string;
  created_at: string;
  image_urls?: string; // Optional image URL for the template
}

/**
 * Interface for Reply Templates Response
 */
export interface ReplyTemplatesResponse {
  code: number;
  message: string;
  data: {
    total: number;
    records: ReplyTemplate[];
  } | null;
}

/**
 * Retrieves reply templates with pagination and optional user filtering
 * 
 * @param params Optional parameters for filtering and pagination
 * @param params.user_id Optional user ID to filter templates by
 * @param params.page Page number for pagination (default: 1)
 * @param params.page_size Number of templates per page (default: 10)
 * @returns Promise with the reply templates response
 */
export const getReplyTemplatesApi = async (params?: {
  user_id?: string; // Deprecated, kept for backward compatibility
  email: string; // User's email address
  page?: number;
  page_size?: number;
}): Promise<ReplyTemplatesResponse> => {
  try {
    if (!params?.email) {
      console.error('Error: email parameter is required for getReplyTemplatesApi');
      throw new Error('email parameter is required');
    }

    const queryParams = new URLSearchParams();

    // Send email parameter to backend
    queryParams.append('email', params.email);
    console.log(`Fetching templates with email: ${params.email}`);

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const baseUrl = getReplyTemplatesUrl || '';
    const url = queryParams.toString()
      ? `${baseUrl}?${queryParams.toString()}`
      : baseUrl;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch reply templates');
    }

    return await response.json() as ReplyTemplatesResponse;
  } catch (error) {
    console.error('Error fetching reply templates:', error);
    throw error;
  }
};

/**
 * Creates a new reply template
 * 
 * @param data Template data to create
 * @param data.content Template content
 * @param data.user_id User ID who owns the template
 * @returns Promise with the created template response
 */
export const createReplyTemplateApi = async (data: {
  content: string;
  user_id?: string; // Deprecated, kept for backward compatibility
  email: string; // User's email address
}): Promise<{ code: number; message: string; data?: { affected_rows: number } }> => {
  try {
    if (!data.email) {
      console.error('Error: email parameter is required for createReplyTemplateApi');
      throw new Error('email parameter is required');
    }

    const baseUrl = updateReplyTemplateUrl || '';
    console.log(`Creating template with email: ${data.email}`);

    // Send email parameter directly to backend
    const userIdentifier = { email: data.email };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add',
        content: data.content,
        ...userIdentifier
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create reply template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating reply template:', error);
    throw error;
  }
};

/**
 * Updates an existing reply template
 * 
 * @param id Template ID to update
 * @param data Template data to update
 * @param data.content Updated template content
 * @param data.user_id User ID who owns the template
 * @returns Promise with the update response
 */
export const updateReplyTemplateApi = async (
  id: number,
  data: {
    content: string;
    user_id?: string; // Deprecated, kept for backward compatibility
    email: string; // User's email address
    image_urls?: string;
  }
): Promise<{ code: number; message: string; data?: { affected_rows: number } }> => {
  try {
    if (!data.email) {
      console.error('Error: email parameter is required for updateReplyTemplateApi');
      throw new Error('email parameter is required');
    }

    const baseUrl = updateReplyTemplateUrl || '';
    console.log(`Updating template ${id} with email: ${data.email}`);

    // Send email parameter directly to backend
    const userIdentifier = { email: data.email };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        template_id: id,
        content: data.content,
        image_urls: data.image_urls,
        ...userIdentifier
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update reply template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating reply template:', error);
    throw error;
  }
};

/**
 * Retrieves all unique comment keywords
 * @param email Optional email to filter keywords by user
 * @returns Promise with the comment keywords response
 */
export const getCommentsKeyword = async (email?: string): Promise<KeywordsResponse> => {
  try {
    const baseUrl = getCommentsKeywordUrl || '';

    // Add email parameter to query if provided
    const url = email ? `${baseUrl}?email=${encodeURIComponent(email)}` : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch comments keywords');
    }

    return await response.json() as Promise<KeywordsResponse>;
  } catch (error) {
    console.error('Error fetching comments keywords:', error);
    throw error;
  }
};

/**
 * Deletes a reply template
 * 
 * @param id Template ID to delete
 * @returns Promise with the deletion response
 */
export const deleteReplyTemplateApi = async (id: number, email: string): Promise<{ code: number; message: string; data?: { affected_rows: number } }> => {
  try {
    if (!email) {
      console.error('Error: email parameter is required for deleteReplyTemplateApi');
      throw new Error('email parameter is required');
    }

    const baseUrl = updateReplyTemplateUrl || '';
    console.log(`Deleting template ${id} with email: ${email}`);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        template_id: id,
        email: email // Send email parameter directly to backend
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete reply template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting reply template:', error);
    throw error;
  }
};

export const getXhsDevicesMsgList = async (email: string = '') => {
  try {
    const baseUrl = getXhsDevicesMsgListUrl || '';

    // Add email parameter to query if provided
    const url = email ? `${baseUrl}?email=${encodeURIComponent(email)}` : baseUrl;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch getXhsDevicesMsgList');
    }

    return await response.json() as Promise<KeywordsResponse>;
  } catch (error) {
    console.error('Error fetching getXhsDevicesMsgList:', error);
    throw error;
  }
}
