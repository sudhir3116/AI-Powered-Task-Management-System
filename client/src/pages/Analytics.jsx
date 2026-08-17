import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import EmptyState from "../components/EmptyState";
import SkeletonLoader from "../components/SkeletonLoader";
import { useWorkspace } from "../context/WorkspaceContext";
import { getWorkspaceAnalytics } from "../services/workspaceService";

const Analytics = () => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;

  const [timeRange, setTimeRange] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");
  const [exportingCsv, setExportingCsv] = useState(false);

  const [analytics, setAnalytics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0,
    memberStats: [],
  });

  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await getWorkspaceAnalytics(workspaceId);
      setAnalytics(res.data || {});
    } catch {
      toast.error("Failed to load workspace analytics");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!analytics) return;
    setExportingCsv(true);

    try {
      const rows = [
        ["Metric", "Value"],
        ["Workspace Name", activeWorkspace?.name || "Personal Workspace"],
        ["Time Range", timeRange.toUpperCase()],
        ["Total Tasks", analytics.totalTasks],
        ["Completed Tasks", analytics.completedTasks],
        ["In Progress Tasks", analytics.inProgressTasks],
        ["Pending Tasks", analytics.pendingTasks],
        ["Overdue Tasks", analytics.overdueTasks],
        ["Completion Rate (%)", `${analytics.completionRate}%`],
        ["High Priority Tasks", analytics.highPriorityTasks],
        ["Medium Priority Tasks", analytics.mediumPriorityTasks],
        ["Low Priority Tasks", analytics.lowPriorityTasks],
        [],
        ["Member Name", "Email", "Role", "Total Tasks", "Completed Tasks", "In Progress Tasks", "Overdue Tasks", "Completion Rate (%)"],
      ];

      (analytics.memberStats || []).forEach((m) => {
        rows.push([
          m.user?.name || "Member",
          m.user?.email || "",
          m.role || "MEMBER",
          m.totalTasks,
          m.completedTasks,
          m.inProgressTasks,
          m.overdueTasks,
          `${m.completionRate}%`,
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `analytics_${activeWorkspace?.slug || "workspace"}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Analytics CSV report exported! 📥");
    } catch {
      toast.error("Failed to export CSV report");
    } finally {
      setExportingCsv(false);
    }
  };

  const total = analytics.totalTasks || 0;

  // Percentage calculations
  const completedPct = total > 0 ? Math.round((analytics.completedTasks / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((analytics.inProgressTasks / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((analytics.pendingTasks / total) * 100) : 0;

  const highPct = total > 0 ? Math.round((analytics.highPriorityTasks / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((analytics.mediumPriorityTasks / total) * 100) : 0;
  const lowPct = total > 0 ? Math.round((analytics.lowPriorityTasks / total) * 100) : 0;

  // Member filtering
  const displayedMemberStats = (analytics.memberStats || []).filter((m) => {
    if (selectedMember === "all") return true;
    const mId = m.user?._id || m.user?.id;
    return mId === selectedMember;
  });

  const metricCards = [
    { label: "Total Tasks", value: analytics.totalTasks, color: "#4f46e5", bg: "rgba(79, 70, 229, 0.05)", icon: "📌" },
    { label: "Completed", value: analytics.completedTasks, color: "#059669", bg: "rgba(5, 150, 105, 0.05)", icon: "✓" },
    { label: "In Progress", value: analytics.inProgressTasks, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.05)", icon: "⏳" },
    { label: "Pending", value: analytics.pendingTasks, color: "#d97706", bg: "rgba(217, 119, 6, 0.05)", icon: "⏹" },
    { label: "Overdue", value: analytics.overdueTasks, color: "#dc2626", bg: "rgba(220, 38, 38, 0.05)", icon: "⚠️" },
    { label: "Completion Rate", value: `${analytics.completionRate}%`, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.05)", icon: "🏆" },
  ];

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: activeWorkspace?.name || "Workspace", to: "/dashboard" },
            { label: "Analytics" },
          ]}
        />

        {/* Header & Controls Toolbar */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3.5}>
          <div>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
              📊 Workspace Analytics & Insights
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Workspace: <strong>{activeWorkspace?.name || "Personal Workspace"}</strong> — Real-time velocity, distribution, and workload performance reports.
            </Typography>
          </div>

          {/* Controls Toolbar */}
          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 2, bgcolor: "#fff", width: 140, fontSize: "0.85rem" } } }}
            >
              <MenuItem value="7d">This Week</MenuItem>
              <MenuItem value="30d">This Month</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 2, bgcolor: "#fff", width: 170, fontSize: "0.85rem" } } }}
            >
              <MenuItem value="all">All Team Members</MenuItem>
              {(analytics.memberStats || []).map((m) => {
                const mId = m.user?._id || m.user?.id;
                return (
                  <MenuItem key={mId} value={mId}>
                    {m.user?.name || "Member"}
                  </MenuItem>
                );
              })}
            </TextField>

            <Button
              variant="contained"
              color="primary"
              onClick={handleExportCSV}
              disabled={exportingCsv || total === 0}
              startIcon={exportingCsv ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", px: 2.5 }}
            >
              {exportingCsv ? "Exporting..." : "📥 Export CSV Report"}
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <SkeletonLoader type="summaryCard" />
              </Grid>
            ))}
          </Grid>
        ) : total === 0 ? (
          <EmptyState
            icon="📈"
            title="Not Enough Analytics Data Yet"
            description="Create tasks and assign team members to begin tracking task distribution, member workload, and completion rates."
          />
        ) : (
          <>
            {/* Compact 6-KPI Row Grid */}
            <Box
              display="grid"
              gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }}
              gap={2}
              mb={3.5}
            >
              {metricCards.map((card) => (
                <Paper
                  key={card.label}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: card.bg,
                    border: "1px solid #e2e8f0",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
                  }}
                  elevation={0}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {card.label}
                    </Typography>
                    <span style={{ fontSize: "0.85rem" }}>{card.icon}</span>
                  </Box>
                  <Typography variant="h4" fontWeight={800} color={card.color}>
                    {card.value}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* 2-Column Visual Distribution Grid */}
            <Grid container spacing={3} mb={3.5}>
              {/* Task Status Distribution */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%" }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      📊 Task Status Distribution
                    </Typography>
                    <Chip label={`${total} Total Tasks`} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                  </Box>

                  <Box display="flex" flexDirection="column" gap={2} mt={2}>
                    {/* Completed Bar */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#059669">
                          ✓ Completed ({analytics.completedTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#059669">
                          {completedPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${completedPct}%`} height="100%" bgcolor="#059669" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>

                    {/* In Progress Bar */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#0ea5e9">
                          ⏳ In Progress ({analytics.inProgressTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#0ea5e9">
                          {inProgressPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${inProgressPct}%`} height="100%" bgcolor="#0ea5e9" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>

                    {/* Pending Bar */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#d97706">
                          ⏹ Pending ({analytics.pendingTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#d97706">
                          {pendingPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${pendingPct}%`} height="100%" bgcolor="#d97706" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>
                  </Box>
                </Paper>
              </Grid>

              {/* Priority Distribution */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", height: "100%" }} elevation={0}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      🔥 Priority Breakdown
                    </Typography>
                    <Chip label="Urgency Level" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
                  </Box>

                  <Box display="flex" flexDirection="column" gap={2} mt={2}>
                    {/* High Priority */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#dc2626">
                          🔥 High Priority ({analytics.highPriorityTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#dc2626">
                          {highPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${highPct}%`} height="100%" bgcolor="#dc2626" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>

                    {/* Medium Priority */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#d97706">
                          ⚡ Medium Priority ({analytics.mediumPriorityTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#d97706">
                          {medPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${medPct}%`} height="100%" bgcolor="#d97706" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>

                    {/* Low Priority */}
                    <div>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={700} color="#059669">
                          🟢 Low Priority ({analytics.lowPriorityTasks})
                        </Typography>
                        <Typography variant="caption" fontWeight={800} color="#059669">
                          {lowPct}%
                        </Typography>
                      </Box>
                      <Box height={10} borderRadius={5} bgcolor="#e2e8f0" overflow="hidden">
                        <Box width={`${lowPct}%`} height="100%" bgcolor="#059669" sx={{ transition: "width 0.4s ease" }} />
                      </Box>
                    </div>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Productivity Velocity & Performance Summary */}
            <Paper sx={{ p: 3, mb: 3.5, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }} elevation={0}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                ⚡ Current Period Productivity Velocity
              </Typography>
              <Grid container spacing={2} mt={0.5}>
                <Grid item xs={12} sm={4}>
                  <Box p={2} borderRadius={2} bgcolor="#ffffff" border="1px solid #e2e8f0">
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      WORKLOAD HEALTH
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main" mt={0.5}>
                      {analytics.completionRate >= 80 ? "🟢 Excellent" : analytics.completionRate >= 50 ? "⚡ Good" : "⚠️ Needs Attention"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Target completion rate is 80%+
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box p={2} borderRadius={2} bgcolor="#ffffff" border="1px solid #e2e8f0">
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      IN-FLIGHT TASKS
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0ea5e9" mt={0.5}>
                      {analytics.inProgressTasks} Active
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Currently being executed by team
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box p={2} borderRadius={2} bgcolor="#ffffff" border="1px solid #e2e8f0">
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      ACTION NEEDED
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color={analytics.overdueTasks > 0 ? "error.main" : "success.main"} mt={0.5}>
                      {analytics.overdueTasks > 0 ? `⚠️ ${analytics.overdueTasks} Overdue` : "✓ 0 Overdue"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      {analytics.overdueTasks > 0 ? "Requires immediate resolution" : "All task deadlines on track"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Team Member Workload & Statistics Table */}
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }} elevation={0}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={800}>
                  👥 Team Workload & Completion Statistics
                </Typography>
                <Chip label={`${displayedMemberStats.length} Members`} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
              </Box>

              {displayedMemberStats.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={3} textAlign="center">
                  No member statistics available for selected filter.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell fontWeight={700}>Team Member</TableCell>
                        <TableCell fontWeight={700}>Role</TableCell>
                        <TableCell fontWeight={700} align="center">Total Tasks</TableCell>
                        <TableCell fontWeight={700} align="center">Completed</TableCell>
                        <TableCell fontWeight={700} align="center">In Progress</TableCell>
                        <TableCell fontWeight={700} align="center">Overdue</TableCell>
                        <TableCell fontWeight={700} align="right">Completion Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayedMemberStats.map((m) => (
                        <TableRow key={m.user?._id || m.user?.id} hover sx={{ transition: "background-color 0.15s" }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Avatar src={m.user?.avatar || undefined} sx={{ width: 32, height: 32, fontSize: "0.8rem", bgcolor: "primary.main", fontWeight: 700 }}>
                                {m.user?.name ? m.user.name[0].toUpperCase() : "?"}
                              </Avatar>
                              <div>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {m.user?.name || "Member"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {m.user?.email || ""}
                                </Typography>
                              </div>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={m.role}
                              size="small"
                              color={m.role === "OWNER" ? "primary" : m.role === "ADMIN" ? "secondary" : "default"}
                              sx={{ fontWeight: 700, fontSize: "0.68rem", height: 22 }}
                            />
                          </TableCell>
                          <TableCell align="center" style={{ fontWeight: 600 }}>
                            {m.totalTasks}
                          </TableCell>
                          <TableCell align="center" style={{ color: "#059669", fontWeight: 700 }}>
                            {m.completedTasks}
                          </TableCell>
                          <TableCell align="center" style={{ color: "#0ea5e9", fontWeight: 600 }}>
                            {m.inProgressTasks}
                          </TableCell>
                          <TableCell
                            align="center"
                            style={{
                              color: m.overdueTasks > 0 ? "#dc2626" : "inherit",
                              fontWeight: m.overdueTasks > 0 ? 800 : 400,
                            }}
                          >
                            {m.overdueTasks > 0 ? `⚠️ ${m.overdueTasks}` : 0}
                          </TableCell>
                          <TableCell align="right" style={{ fontWeight: 800 }}>
                            {m.completionRate}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Analytics;
