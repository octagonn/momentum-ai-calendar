import { subscriptionService, SubscriptionTier } from './subscriptionService';
import { supabase } from '@/lib/supabase-client';

export enum Feature {
  // Free tier features
  BASIC_GOAL_CREATION = 'basic_goal_creation',
  BASIC_TASK_MANAGEMENT = 'basic_task_management',
  BASIC_CALENDAR_VIEW = 'basic_calendar_view',
  LOCAL_NOTIFICATIONS = 'local_notifications',
  DARK_LIGHT_THEME = 'dark_light_theme',
  BASIC_DASHBOARD = 'basic_dashboard',
  
  // Premium tier features
  UNLIMITED_GOALS = 'unlimited_goals',
  AI_GOAL_CREATION = 'ai_goal_creation',
  AI_CHAT_COACH = 'ai_chat_coach',
  ADVANCED_ANALYTICS = 'advanced_analytics',
  SMART_SCHEDULING = 'smart_scheduling',
  CUSTOM_GOAL_COLORS = 'custom_goal_colors',
  PRIORITY_SUPPORT = 'priority_support',
  EARLY_ACCESS_FEATURES = 'early_access_features',
}

interface FeatureConfig {
  requiredTiers: SubscriptionTier[];
  limit?: number; // For features with limits (e.g., 3 goals for free tier)
  upgradeMessage: string;
  upgradeTitle: string;
}

class FeatureGateService {
  private static instance: FeatureGateService;
  private userTier: SubscriptionTier = 'free';
  private cachedGoalCount: number | null = null;
  private lastGoalCountCheck: Date | null = null;
  private mockPremiumOverride: boolean = false; // For testing when DB migration is missing
  
  // Feature configuration
  private readonly featureConfig: Record<Feature, FeatureConfig> = {
    // Free features (available to all)
    [Feature.BASIC_GOAL_CREATION]: {
      requiredTiers: ['free', 'premium', 'family'],
      limit: 1, // Free users limited to 1 active goal
      upgradeMessage: 'Upgrade to Premium to create unlimited goals and unlock AI-powered goal planning.',
      upgradeTitle: 'Goal Limit Reached',
    },
    [Feature.BASIC_TASK_MANAGEMENT]: {
      requiredTiers: ['free', 'premium', 'family'],
      upgradeMessage: '',
      upgradeTitle: '',
    },
    [Feature.BASIC_CALENDAR_VIEW]: {
      requiredTiers: ['free', 'premium', 'family'],
      upgradeMessage: '',
      upgradeTitle: '',
    },
    [Feature.LOCAL_NOTIFICATIONS]: {
      requiredTiers: ['free', 'premium', 'family'],
      upgradeMessage: '',
      upgradeTitle: '',
    },
    [Feature.DARK_LIGHT_THEME]: {
      requiredTiers: ['free', 'premium', 'family'],
      upgradeMessage: '',
      upgradeTitle: '',
    },
    [Feature.BASIC_DASHBOARD]: {
      requiredTiers: ['free', 'premium', 'family'],
      upgradeMessage: '',
      upgradeTitle: '',
    },
    
    // Premium features
    [Feature.UNLIMITED_GOALS]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Create unlimited goals with a Premium subscription.',
      upgradeTitle: 'Premium Feature',
    },
    [Feature.AI_GOAL_CREATION]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Let AI help you create personalized goals with smart scheduling. Upgrade to Premium to unlock this feature.',
      upgradeTitle: 'AI Goal Creation',
    },
    [Feature.AI_CHAT_COACH]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Get personalized coaching and motivation from your AI assistant. Available with Premium.',
      upgradeTitle: 'AI Chat Coach',
    },
    [Feature.ADVANCED_ANALYTICS]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Unlock detailed insights and progress reports with Premium.',
      upgradeTitle: 'Advanced Analytics',
    },
    [Feature.SMART_SCHEDULING]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Let AI optimize your schedule for maximum productivity. Available with Premium.',
      upgradeTitle: 'Smart Scheduling',
    },
    [Feature.CUSTOM_GOAL_COLORS]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Personalize each goal with custom colors. Upgrade to Premium to unlock this feature.',
      upgradeTitle: 'Custom Colors',
    },
    [Feature.PRIORITY_SUPPORT]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Get priority support with Premium.',
      upgradeTitle: 'Priority Support',
    },
    [Feature.EARLY_ACCESS_FEATURES]: {
      requiredTiers: ['premium', 'family'],
      upgradeMessage: 'Get early access to new features with Premium.',
      upgradeTitle: 'Early Access',
    },
  };

  private constructor() {}

  public static getInstance(): FeatureGateService {
    if (!FeatureGateService.instance) {
      FeatureGateService.instance = new FeatureGateService();
    }
    return FeatureGateService.instance;
  }

  async initialize(userId: string): Promise<void> {
    try {
      // Get user's subscription tier from database
      const { data, error } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (!error && data) {
        this.userTier = data.subscription_tier || 'free';
      }

      // Also check with RevenueCat for the most up-to-date status
      const subscriptionInfo = await subscriptionService.getSubscriptionInfo();
      if (subscriptionInfo.isActive) {
        this.userTier = subscriptionInfo.tier;
      }
    } catch (error) {
      console.error('Error initializing feature gate:', error);
      this.userTier = 'free';
    }
  }

  // Method to set mock premium status for testing
  setMockPremiumOverride(isPremium: boolean): void {
    this.mockPremiumOverride = isPremium;
    if (isPremium) {
      this.userTier = 'premium';
      console.log('FeatureGate: Mock premium override activated');
    } else {
      this.userTier = 'free';
      console.log('FeatureGate: Mock premium override deactivated');
    }
  }

  // Get current premium status (including mock override)
  getCurrentTier(): SubscriptionTier {
    return this.mockPremiumOverride ? 'premium' : this.userTier;
  }

  async canAccessFeature(feature: Feature, userId?: string): Promise<{ 
    hasAccess: boolean; 
    reason?: string;
    requiresUpgrade: boolean;
    upgradeMessage?: string;
    upgradeTitle?: string;
  }> {
    const config = this.featureConfig[feature];
    
    if (!config) {
      return { hasAccess: true, requiresUpgrade: false };
    }

    // Use current tier (which includes mock override)
    const currentTier = this.getCurrentTier();
    const hasBasicAccess = config.requiredTiers.includes(currentTier);
    
    // For features with limits, check the limit
    if (feature === Feature.BASIC_GOAL_CREATION && config.limit) {
      const goalCount = await this.getUserGoalCount(userId);
      
      if (currentTier === 'free' && goalCount >= config.limit) {
        return {
          hasAccess: false,
          reason: `Free users are limited to ${config.limit} active goals.`,
          requiresUpgrade: true,
          upgradeMessage: config.upgradeMessage,
          upgradeTitle: config.upgradeTitle,
        };
      }
    }

    if (!hasBasicAccess) {
      return {
        hasAccess: false,
        reason: 'This feature requires a premium subscription.',
        requiresUpgrade: true,
        upgradeMessage: config.upgradeMessage,
        upgradeTitle: config.upgradeTitle,
      };
    }

    return { hasAccess: true, requiresUpgrade: false };
  }

  async checkGoalLimit(userId: string): Promise<{ 
    canCreateGoal: boolean; 
    currentCount: number; 
    limit: number;
  }> {
    const goalCount = await this.getUserGoalCount(userId);
    const limit = this.userTier === 'free' ? 1 : Number.MAX_SAFE_INTEGER;
    
    return {
      canCreateGoal: goalCount < limit,
      currentCount: goalCount,
      limit,
    };
  }

  private async getUserGoalCount(userId?: string): Promise<number> {
    if (!userId) return 0;

    // Cache goal count for 5 minutes to reduce database queries
    const now = new Date();
    if (
      this.cachedGoalCount !== null && 
      this.lastGoalCountCheck && 
      (now.getTime() - this.lastGoalCountCheck.getTime()) < 5 * 60 * 1000
    ) {
      return this.cachedGoalCount;
    }

    try {
      const { count, error } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!error && count !== null) {
        this.cachedGoalCount = count;
        this.lastGoalCountCheck = now;
        return count;
      }
    } catch (error) {
      console.error('Error counting user goals:', error);
    }

    return 0;
  }

  invalidateGoalCountCache(): void {
    this.cachedGoalCount = null;
    this.lastGoalCountCheck = null;
  }

  getUserTier(): SubscriptionTier {
    return this.userTier;
  }

  isPremium(): boolean {
    return this.userTier === 'premium' || this.userTier === 'family';
  }

  getDefaultGoalColor(): string {
    // Free users get the default blue color
    return '#3B82F6';
  }

  canCustomizeGoalColor(): boolean {
    return this.isPremium();
  }

  getFeatureUpgradeInfo(feature: Feature): {
    title: string;
    message: string;
    benefits: string[];
  } {
    const config = this.featureConfig[feature];
    
    return {
      title: config?.upgradeTitle || 'Upgrade to Premium',
      message: config?.upgradeMessage || 'This feature requires a premium subscription.',
      benefits: [
        '✓ Unlimited goals',
        '✓ AI-powered goal creation',
        '✓ Custom colors for each goal',
        '✓ Advanced analytics',
        '✓ Smart scheduling',
        '✓ Priority support',
      ],
    };
  }
}

export const featureGate = FeatureGateService.getInstance();
