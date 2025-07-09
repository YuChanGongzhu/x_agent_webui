import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { supabase } from "../auth/supabaseConfig";
import { UserProfile } from "../context/type";
import { UserProfileService } from "../management/userManagement/userProfileService";

// 用户状态接口 - 与 UserContext 保持一致
interface UserState {
  // 用户配置信息
  userProfile: UserProfile | null;
  // 用户是否为管理员
  isAdmin: boolean;
  // 是否正在加载用户信息
  isLoading: boolean;
  // 加载用户信息时的错误信息
  error: string | null;
  // 用户邮箱
  email: string | null;
  // 是否已初始化
  isInitialized: boolean;
}

// 用户操作接口
interface UserActions {
  // 设置用户配置
  setUserProfile: (profile: UserProfile | null) => void;
  // 设置管理员状态
  setIsAdmin: (isAdmin: boolean) => void;
  // 设置加载状态
  setIsLoading: (isLoading: boolean) => void;
  // 设置错误信息
  setError: (error: string | null) => void;
  // 设置用户邮箱
  setEmail: (email: string | null) => void;
  // 初始化用户信息
  initialize: () => Promise<void>;
  // 刷新用户配置
  refreshUserProfile: () => Promise<void>;
  // 重置状态（登出时使用）
  reset: () => void;
}

// 完整的 store 接口
interface UserStore extends UserState, UserActions {}

// 默认状态
const defaultState: UserState = {
  userProfile: null,
  isAdmin: false,
  isLoading: false, // 改为 false，避免初始化时的竞态条件
  error: null,
  email: null,
  isInitialized: false,
};

/**
 * 检查用户会话状态
 * @returns 会话中的用户信息
 */
const checkUserSession = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('未登录');
  }
  return sessionData.session.user;
};

/**
 * 更新用户角色状态
 * @param profile 用户配置
 * @param userMetadata 用户元数据
 */
const determineUserRole = (profile: UserProfile | null, userMetadata: any): boolean => {
  const userRole = profile?.role || userMetadata?.role || 'user';
  const isUserAdmin = typeof userRole === 'string' && userRole.toLowerCase() === 'admin';
  
  console.log('🔍 用户角色判断:', {
    profileRole: profile?.role,
    metadataRole: userMetadata?.role,
    finalRole: userRole,
    isAdmin: isUserAdmin
  });
  
  return isUserAdmin;
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        ...defaultState,

        // 基础设置方法
        setUserProfile: (profile) => {
          console.log('📝 设置用户配置:', profile);
          set({ userProfile: profile }, false, 'setUserProfile');
        },

        setIsAdmin: (isAdmin) => {
          console.log('👑 设置管理员状态:', isAdmin);
          set({ isAdmin }, false, 'setIsAdmin');
        },

        setIsLoading: (isLoading) => {
          set({ isLoading }, false, 'setIsLoading');
        },

        setError: (error) => {
          console.log('❌ 设置错误信息:', error);
          set({ error }, false, 'setError');
        },

        setEmail: (email) => {
          console.log('📧 设置用户邮箱:', email);
          set({ email }, false, 'setEmail');
        },

        // 初始化用户信息
        initialize: async () => {
          const state = get();
          
          // 如果已经在加载中或已初始化，避免重复调用
          if (state.isLoading || state.isInitialized) {
            console.log('⏳ UserStore: 用户信息正在加载中或已初始化，跳过重复调用', {
              isLoading: state.isLoading,
              isInitialized: state.isInitialized
            });
            return;
          }

          try {
            console.log('🚀 UserStore: 开始初始化用户信息...');
            set({ isLoading: true, error: null }, false, 'initialize:start');

            // 1. 获取用户会话信息
            const user = await checkUserSession();
            console.log('✅ UserStore: 获取到用户会话:', { id: user.id, email: user.email });

            // 2. 保存用户邮箱
            if (user.email) {
              set({ email: user.email }, false, 'initialize:setEmail');
            }

            // 3. 获取用户配置信息
            const profile = await UserProfileService.getUserProfile(user.id);
            console.log('✅ UserStore: 获取到用户配置:', profile);

            // 4. 判断用户角色
            const isAdmin = determineUserRole(profile, user.user_metadata);

            // 5. 更新所有状态
            set({
              userProfile: profile,
              isAdmin,
              isLoading: false,
              error: null,
              isInitialized: true,
            }, false, 'initialize:complete');

            console.log('🎉 UserStore: 用户信息初始化完成', {
              profile: !!profile,
              isAdmin,
              email: user.email
            });

          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '未知错误';
            console.error('💥 UserStore: 初始化用户信息失败:', err);
            
            set({
              error: errorMessage,
              isLoading: false,
              isInitialized: true, // 即使失败也标记为已初始化，避免无限重试
            }, false, 'initialize:error');
          }
        },

        // 刷新用户配置
        refreshUserProfile: async () => {
          console.log('🔄 刷新用户配置...');
          await get().initialize();
        },

        // 重置状态（登出时使用）
        reset: () => {
          console.log('🔄 重置用户状态');
          set(defaultState, false, 'reset');
        },
      }),
      {
        name: 'user-store',
        // 只持久化必要的数据，不持久化 isLoading 等临时状态
        partialize: (state) => ({
          userProfile: state.userProfile,
          isAdmin: state.isAdmin,
          email: state.email,
          isInitialized: state.isInitialized,
        }),
        version: 1,
        // 数据迁移函数 - 处理从旧版本到新版本的数据转换
        migrate: (persistedState: any, version: number) => {
          console.log('🔄 UserStore 数据迁移:', { version, persistedState });
          
          if (version === 0) {
            // 从版本 0 迁移到版本 1
            // 处理旧的 userStore 结构 { user: User | null }
            const oldState = persistedState as { user?: any };
            
            if (oldState.user) {
              // 将旧的 user 对象转换为新的结构
              return {
                userProfile: {
                  email: oldState.user.email,
                  display_name: oldState.user.name,
                  role: oldState.user.role,
                } as UserProfile,
                isAdmin: oldState.user.role?.toLowerCase() === 'admin',
                email: oldState.user.email,
                isInitialized: false, // 强制重新初始化
              };
            } else {
              // 如果没有旧数据，返回默认状态
              return {
                userProfile: null,
                isAdmin: false,
                email: null,
                isInitialized: false,
              };
            }
          }
          
          // 如果是当前版本或更高版本，直接返回
          return persistedState;
        },
      }
    ),
    {
      name: 'UserStore',
    }
  )
);

// 监听认证状态变化，自动初始化用户信息
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔐 UserStore: 认证状态变化:', {
    event,
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email
  });
  
  const store = useUserStore.getState();
  console.log('🔐 UserStore: 当前状态:', {
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    userProfile: !!store.userProfile,
    email: store.email
  });
  
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
    // 用户登录时自动初始化
    console.log('👤 UserStore: 用户登录，开始自动初始化...');
    await store.initialize();
  } else if (event === 'SIGNED_OUT') {
    // 用户登出时重置状态
    console.log('👋 UserStore: 用户登出，重置状态...');
    store.reset();
  }
});

// 导出选择器函数，方便组件使用
export const userSelectors = {
  userProfile: (state: UserStore) => state.userProfile,
  isAdmin: (state: UserStore) => state.isAdmin,
  isLoading: (state: UserStore) => state.isLoading,
  error: (state: UserStore) => state.error,
  email: (state: UserStore) => state.email,
  isInitialized: (state: UserStore) => state.isInitialized,
};