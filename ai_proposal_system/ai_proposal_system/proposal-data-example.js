// 기존 Node.js 백엔드 서버에서 proposal-data API를 호출하는 예시
// 이 코드를 기존 백엔드의 라우터에 추가하면 됩니다.

const axios = require('axios');

const ADMIN_SERVER_URL = process.env.ADMIN_SERVER_URL || 'http://localhost:8080';

/**
 * User A가 앱을 실행할 때 호출하는 API
 * 기존 백엔드에서 관리자 서버로 데이터를 가져와 앱에 전달
 */
async function getProposalData(req, res) {
  const { userCode } = req.params;

  try {
    const response = await axios.get(
      `${ADMIN_SERVER_URL}/api/users/${userCode}/proposal-data`,
      { timeout: 10000 }
    );

    const { user, video, questions } = response.data.data;

    // 필요에 따라 기존 백엔드 형식으로 가공
    return res.json({
      success: true,
      data: {
        user,
        video,
        questions,
      },
    });
  } catch (error) {
    console.error('proposal-data fetch error:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    return res.status(500).json({ success: false, message: '데이터 조회 실패' });
  }
}

// Express 라우터 예시
// const express = require('express');
// const router = express.Router();
// router.get('/proposal/:userCode', getProposalData);
// module.exports = router;

module.exports = { getProposalData };
