import { Box, Paper, Skeleton } from "@mui/material";

export const TaskCardSkeleton = () => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 3,
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
      height: 220,
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="rounded" width={60} height={20} />
    </Box>
    <Skeleton variant="text" width="100%" height={16} />
    <Skeleton variant="text" width="80%" height={16} />
    <Box display="flex" gap={1} mt={1}>
      <Skeleton variant="rounded" width={50} height={18} />
      <Skeleton variant="rounded" width={50} height={18} />
    </Box>
    <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
      <Skeleton variant="circular" width={28} height={28} />
      <Skeleton variant="rounded" width={80} height={24} />
    </Box>
  </Paper>
);

export const SummaryCardSkeleton = () => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      borderRadius: 3,
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Skeleton variant="text" width="50%" height={16} />
    <Skeleton variant="text" width="70%" height={36} />
  </Paper>
);

export const TableRowSkeleton = () => (
  <Box display="flex" alignItems="center" justifyContent="space-between" py={1.5} px={2} borderBottom="1px solid #f1f5f9">
    <Box display="flex" alignItems="center" gap={1.5} flex={2}>
      <Skeleton variant="circular" width={32} height={32} />
      <Box width="60%">
        <Skeleton variant="text" width="80%" height={18} />
        <Skeleton variant="text" width="50%" height={14} />
      </Box>
    </Box>
    <Skeleton variant="rounded" width={70} height={22} flex={1} />
    <Skeleton variant="text" width={40} height={18} flex={1} />
  </Box>
);

export default TaskCardSkeleton;
