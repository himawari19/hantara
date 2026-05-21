export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          owner_id: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
        };
        Update: {
          role?: "owner" | "editor" | "viewer";
        };
      };
      collections: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          collection_id: string;
          parent_folder_id: string | null;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          parent_folder_id?: string | null;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          parent_folder_id?: string | null;
          sort_order?: number;
        };
      };
      requests: {
        Row: {
          id: string;
          collection_id: string;
          folder_id: string | null;
          name: string;
          method: string;
          url: string;
          headers: Record<string, any>[];
          body: string;
          body_type: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          collection_id: string;
          folder_id?: string | null;
          name: string;
          method: string;
          url: string;
          headers?: Record<string, any>[];
          body?: string;
          body_type?: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          method?: string;
          url?: string;
          headers?: Record<string, any>[];
          body?: string;
          body_type?: string;
          folder_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
      };
      environments: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          variables: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          variables?: Record<string, string>;
        };
        Update: {
          name?: string;
          variables?: Record<string, string>;
          updated_at?: string;
        };
      };
      request_history: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          method: string;
          url: string;
          status: number;
          response_time: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          workspace_id: string;
          method: string;
          url: string;
          status: number;
          response_time: number;
        };
        Update: never;
      };
    };
  };
}
