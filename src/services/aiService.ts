export interface SmartTaskSuggestion {
  category: "Shopping" | "Home" | "School" | "Vacation" | "Health" | "Celebration" | "Travel" | "Other";
  subCategory?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate?: string;
  assignedToSuggestion?: string;
}

export interface SmartMessageSuggestion {
  category: string;
  tags: string[];
}

export const categorizeTask = async (title: string): Promise<SmartTaskSuggestion> => {
  try {
    const res = await fetch('/api/categorize-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("AI Task Categorization failed", error);
    return { category: "Other", priority: "Medium" };
  }
};

export const categorizeMessage = async (content: string): Promise<SmartMessageSuggestion> => {
  try {
    const res = await fetch('/api/categorize-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("AI Message Categorization failed", error);
    return { category: "Note", tags: [] };
  }
};

export const getGroceriesSuggestions = async (recentTasks: string[]): Promise<string[]> => {
  try {
    const res = await fetch('/api/grocery-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recentTasks })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("AI Grocery Suggestions failed", error);
    return [];
  }
};

export const generateAiAvatar = async (prompt: string): Promise<string> => {
  const res = await fetch('/api/generate-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }
  const data = await res.json();
  if (!data.svg) {
    throw new Error("No SVG returned from AI");
  }
  return data.svg;
};

export interface PrioritizedTaskResult {
  id: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  reason: string;
}

export const prioritizeTasks = async (tasks: any[]): Promise<PrioritizedTaskResult[]> => {
  try {
    const res = await fetch('/api/prioritize-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${res.status}`);
    }
    const data = await res.json();
    return data.prioritizedTasks || [];
  } catch (error) {
    console.error("AI Prioritize Tasks failed", error);
    return [];
  }
};
