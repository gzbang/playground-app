import { queryCourseListInfo } from "@/service/courseAPI";
import { ref } from "vue";

const STATUS_MAP = {
  test: "test",
  online: "online",
};

export const courseList = ref([]);
export const courseLoaded = ref(false);

queryCourseListInfo(STATUS_MAP.test).then((data) => {
  courseList.value = data;
  courseLoaded.value = true;
});
