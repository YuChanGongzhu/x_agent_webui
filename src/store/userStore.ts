import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { supabase } from "../auth/supabaseConfig";
import { UserProfile } from "../context/type";
import { UserProfileService } from "../management/userManagement/userProfileService";
import { triggerDagRun, getDagRunDetail, getVariable } from "../api/airflow";
// 用户状态接口 - 与 UserContext 保持一致
interface UserState {
  // 用户配置信息
  userProfile: UserProfile | null;
  // 用户是否为管理员
  isAdmin: boolean;
  // 是否正在加载用户信息
  isLoading: boolean;
  // 是否正在刷新设备列表
  isRefreshingDeviceList: boolean;
  // 加载用户信息时的错误信息
  error: string | null;
  // 用户邮箱
  email: string | null;
  // 是否已初始化
  isInitialized: boolean;
  //用户拥有设备的账号昵称列表
  userDeviceNickNameList: string[];
  // 本次登录是否已触发过设备列表轮询
  hasPolledDeviceList: boolean;
}

// 用户操作接口
interface UserActions {
  // 设置用户配置
  setUserProfile: (profile: UserProfile | null) => void;
  // 设置管理员状态
  setIsAdmin: (isAdmin: boolean) => void;
  // 设置加载状态
  setIsLoading: (isLoading: boolean) => void;
  // 设置设备刷新状态
  setIsRefreshingDeviceList: (isRefreshing: boolean) => void;
  // 设置错误信息
  setError: (error: string | null) => void;
  // 设置用户邮箱
  setEmail: (email: string | null) => void;
  // 设置用户设备昵称列表
  setUserDeviceNickNameList: (nickNameList: string[]) => void;
  // 设置是否已轮询过设备列表
  setHasPolledDeviceList: (hasPolled: boolean) => void;
  // 初始化用户信息
  initialize: (force?: boolean) => Promise<void>;
  // 刷新用户配置
  refreshUserProfile: () => Promise<void>;
  // 刷新用户设备信息
  refreshUserDeviceList: () => Promise<void>;
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
  isRefreshingDeviceList: false,
  error: null,
  email: null,
  isInitialized: false,
  userDeviceNickNameList: [],
  hasPolledDeviceList: false,
};

/**
 * 检查用户会话状态
 * @returns 会话中的用户信息
 */
const checkUserSession = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("未登录");
  }
  return sessionData.session.user;
};

/**
 * 更新用户角色状态
 * @param profile 用户配置
 * @param userMetadata 用户元数据
 */
const determineUserRole = (profile: UserProfile | null, userMetadata: any): boolean => {
  const userRole = profile?.role || userMetadata?.role || "user";
  const isUserAdmin = typeof userRole === "string" && userRole.toLowerCase() === "admin";

  console.log("🔍 用户角色判断:", {
    profileRole: profile?.role,
    metadataRole: userMetadata?.role,
    finalRole: userRole,
    isAdmin: isUserAdmin,
  });

  return isUserAdmin;
};

// 用于防止重复调用的标记
let isGettingDeviceList = false;

//轮训用户设备账号dag，成功就执行获取用户设备账号信息
const getUserDeviceNickNameList = async (
  email: string | null,
  interval = 3 * 1000,
  isAdmin: boolean
) => {
  if (!email) {
    console.log("❌ 邮箱为空，无法获取设备信息");
    return;
  }

  // 防止重复调用
  if (isGettingDeviceList) {
    console.log("⏳ 正在获取设备信息中，跳过重复调用");
    return;
  }

  isGettingDeviceList = true;
  console.log("🚀 开始获取用户设备信息...", email);

  // 标记开始刷新设备列表
  try {
    const store = useUserStore.getState();
    store.setIsRefreshingDeviceList(true);
  } catch (e) {
    // ignore
  }

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
  const dag_run_id = "xhs_account_name_colletor_" + timestamp;
  const conf = {
    email: email,
  };

  const poll = async () => {
    try {
      const response = await getDagRunDetail("xhs_account_name_colletor", dag_run_id);
      if (response.state === "success") {
        //调用获取用户设备账号
        const accountResponse = await getVariable("XHS_ACCOUNT_INFO");
        const accountData = JSON.parse(accountResponse.value);
        console.log("获取用户设备账号成功", accountData);
        if (isAdmin) {
          const mergedArray: any = Object.values(accountData).reduce((acc: any, arr: any) => {
            return [...acc, ...arr];
          }, []);
          console.log("合并后的数组:", mergedArray);

          const store = useUserStore.getState();
          store.setUserDeviceNickNameList(mergedArray);
        } else {
          // 处理数据结构：accountData 是对象 {email: Array}
          const userAccounts = accountData[email] || [];
          console.log("当前用户账号:", userAccounts);
          // 更新到store中
          const store = useUserStore.getState();
          store.setUserDeviceNickNameList(userAccounts);
        }

        console.log("✅ 用户设备账号信息获取完成，停止轮询");
        isGettingDeviceList = false; // 重置标记
        // 刷新结束
        try {
          const store = useUserStore.getState();
          store.setIsRefreshingDeviceList(false);
        } catch (e) {
          // ignore
        }
        return; // 成功后退出轮询
      } else if (response.state === "failed") {
        console.log("❌ DAG任务失败，停止轮询");
        isGettingDeviceList = false; // 重置标记
        // 刷新结束
        try {
          const store = useUserStore.getState();
          store.setIsRefreshingDeviceList(false);
        } catch (e) {
          // ignore
        }
        return; // 失败后也要退出轮询
      }
      // 如果状态是 running 或其他，继续轮询
      console.log("⏳ DAG任务状态:", response.state, "继续轮询...");
    } catch (err) {
      console.log("poll attempt failed", err);
    }

    // 只有在任务未完成时才继续轮询
    setTimeout(poll, interval);
  };

  // 创建dag任务
  const promise = triggerDagRun("xhs_account_name_colletor", dag_run_id, conf);
  promise
    .then(() => {
      // 成功就轮询
      poll();
    })
    .catch((err) => {
      console.log("创建dag任务失败", err);
      isGettingDeviceList = false; // 创建失败时重置标记
    });
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        ...defaultState,

        // 基础设置方法
        setUserProfile: (profile) => {
          console.log("📝 设置用户配置:", profile);
          set({ userProfile: profile }, false, "setUserProfile");
        },

        setIsAdmin: (isAdmin) => {
          console.log("👑 设置管理员状态:", isAdmin);
          set({ isAdmin }, false, "setIsAdmin");
        },

        setIsLoading: (isLoading) => {
          set({ isLoading }, false, "setIsLoading");
        },

        setIsRefreshingDeviceList: (isRefreshing) => {
          set({ isRefreshingDeviceList: isRefreshing }, false, "setIsRefreshingDeviceList");
        },

        setError: (error) => {
          console.log("❌ 设置错误信息:", error);
          set({ error }, false, "setError");
        },

        setEmail: (email) => {
          console.log("📧 设置用户邮箱:", email);
          set({ email }, false, "setEmail");
        },

        setUserDeviceNickNameList: (nickNameList) => {
          console.log("📱 设置用户设备昵称列表:", nickNameList);
          set({ userDeviceNickNameList: nickNameList }, false, "setUserDeviceNickNameList");
        },

        setHasPolledDeviceList: (hasPolled) => {
          console.log("🔁 设置已轮询设备标记:", hasPolled);
          set({ hasPolledDeviceList: hasPolled }, false, "setHasPolledDeviceList");
        },

        // 初始化用户信息
        initialize: async (force = false) => {
          const state = get();

          // 如果已经在加载中或已初始化，避免重复调用
          if ((state.isLoading || state.isInitialized) && !force) {
            console.log("⏳ UserStore: 用户信息正在加载中或已初始化，跳过重复调用", {
              isLoading: state.isLoading,
              isInitialized: state.isInitialized,
            });
            return;
          }

          try {
            console.log("🚀 UserStore: 开始初始化用户信息...");
            set({ isLoading: true, error: null }, false, "initialize:start");

            // 1. 获取用户会话信息
            const user = await checkUserSession();
            console.log("✅ UserStore: 获取到用户会话:", { id: user.id, email: user.email });

            // 2. 保存用户邮箱
            if (user.email) {
              set({ email: user.email }, false, "initialize:setEmail");
            }

            // 3. 获取用户配置信息
            const profile = await UserProfileService.getUserProfile(user.id);
            console.log("✅ UserStore: 获取到用户配置:", profile);

            // 4. 判断用户角色
            const isAdmin = determineUserRole(profile, user.user_metadata);

            // 5. 更新所有状态
            set(
              {
                userProfile: profile,
                isAdmin,
                isLoading: false,
                error: null,
                isInitialized: true,
              },
              false,
              "initialize:complete"
            );
            // 6. 根据情况获取用户设备信息
            if (user.email) {
              const hasPolled = get().hasPolledDeviceList;
              if (!hasPolled) {
                console.log("🔄 UserStore: 首次登录，开始轮询获取用户设备信息...", {
                  isAdmin,
                  email: user.email,
                });
                // 仅首次登录触发一次轮询
                getUserDeviceNickNameList(user.email, 3 * 1000, isAdmin);
                // 设置已触发标记，避免后续刷新或路由切换再次轮询
                set({ hasPolledDeviceList: true }, false, "initialize:setHasPolledDeviceList");
              } else {
                console.log("✅ UserStore: 本次登录已轮询过设备信息，跳过", {
                  deviceCount: get().userDeviceNickNameList.length,
                  currentIsAdmin: isAdmin,
                });
              }
            }

            console.log("🎉 UserStore: 用户信息初始化完成", {
              profile: !!profile,
              isAdmin,
              email: user.email,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "未知错误";
            console.error("💥 UserStore: 初始化用户信息失败:", err);

            set(
              {
                error: errorMessage,
                isLoading: false,
                isInitialized: true, // 即使失败也标记为已初始化，避免无限重试
              },
              false,
              "initialize:error"
            );
          }
        },

        // 刷新用户配置
        refreshUserProfile: async () => {
          console.log("🔄 刷新用户配置...");
          await get().initialize();
        },

        // 刷新用户设备信息(手动)
        refreshUserDeviceList: async () => {
          const state = get();
          if (state.email) {
            console.log("🔄 手动刷新用户设备信息...");
            getUserDeviceNickNameList(state.email, 3 * 1000, state.isAdmin);
          } else {
            console.log("❌ 无法刷新设备信息：用户邮箱为空");
          }
        },

        // 重置状态（登出时使用）
        reset: () => {
          console.log("🔄 重置用户状态");
          set(defaultState, false, "reset");
        },
      }),
      {
        name: "user-store",
        // 只持久化必要的数据，不持久化 isLoading 等临时状态
        partialize: (state) => ({
          userProfile: state.userProfile,
          isAdmin: state.isAdmin,
          email: state.email,
          isInitialized: state.isInitialized,
          userDeviceNickNameList: state.userDeviceNickNameList,
          hasPolledDeviceList: state.hasPolledDeviceList,
        }),
        version: 1,
        // 数据迁移函数 - 处理从旧版本到新版本的数据转换
        migrate: (persistedState: any, version: number) => {
          console.log("🔄 UserStore 数据迁移:", { version, persistedState });

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
                isAdmin: oldState.user.role?.toLowerCase() === "admin",
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
      name: "UserStore",
    }
  )
);

// 用于防止重复处理认证事件的标记
let lastProcessedSession: string | null = null;

// 监听认证状态变化，自动初始化用户信息
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("🔐 UserStore: 认证状态变化:", {
    event,
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
  });

  const store = useUserStore.getState();
  const sessionId = session?.user?.id || null;

  // 登录/初始/刷新/用户更新事件
  if (
    (event === "SIGNED_IN" ||
      event === "INITIAL_SESSION" ||
      event === "TOKEN_REFRESHED" ||
      event === "USER_UPDATED") &&
    session?.user
  ) {
    const isSameUser = store.email === session.user.email;
    const isPageRefresh = event === "INITIAL_SESSION" && store.isInitialized;

    // 仅在会话相同、邮箱也相同、且不是页面刷新时才跳过
    if (lastProcessedSession === sessionId && isSameUser && !isPageRefresh) {
      console.log("⏭️ UserStore: 同一会话且邮箱一致，跳过重复处理", { event, sessionId });
      return;
    }

    console.log("🔐 UserStore: 当前状态:", {
      isLoading: store.isLoading,
      isInitialized: store.isInitialized,
      userProfile: !!store.userProfile,
      email: store.email,
      isPageRefresh,
    });

    // 标记当前会话已处理
    lastProcessedSession = sessionId;

    // 先同步邮箱，减少短暂不一致
    if (!isSameUser && session.user.email) {
      store.setEmail(session.user.email);
      // 用户切换时清空设备列表，强制重新获取
      store.setUserDeviceNickNameList([]);
      // 用户切换时重置已轮询标记，确保新用户可重新轮询
      store.setHasPolledDeviceList(false);
      console.log("🔄 UserStore: 用户切换，清空设备列表");
    }

    // 页面刷新或用户切换时强制重新初始化
    const shouldForceInit = !isSameUser || isPageRefresh;
    console.log("👤 UserStore: 用户登录/刷新，开始初始化...", {
      isSameUser,
      isPageRefresh,
      shouldForceInit,
      sessionEmail: session.user.email,
      storedEmail: store.email,
    });
    await store.initialize(shouldForceInit);
  } else if (event === "SIGNED_OUT") {
    // 用户登出时重置状态和标记
    console.log("👋 UserStore: 用户登出，重置状态...");
    lastProcessedSession = null;
    isGettingDeviceList = false; // 同时重置设备获取标记
    store.reset();
  }
});

// 导出选择器函数，方便组件使用
export const userSelectors = {
  userProfile: (state: UserStore) => state.userProfile,
  isAdmin: (state: UserStore) => state.isAdmin,
  isLoading: (state: UserStore) => state.isLoading,
  isRefreshingDeviceList: (state: UserStore) => state.isRefreshingDeviceList,
  error: (state: UserStore) => state.error,
  email: (state: UserStore) => state.email,
  isInitialized: (state: UserStore) => state.isInitialized,
  userDeviceNickNameList: (state: UserStore) => state.userDeviceNickNameList,
  refreshUserDeviceList: (state: UserStore) => state.refreshUserDeviceList,
};
