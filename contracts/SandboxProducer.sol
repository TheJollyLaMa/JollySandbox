// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Sandbox_Producer is Ownable {
    IERC20 public token; // The ERC-20 token used for payouts
    address public producer;

    uint256 public constant SIGNING_BONUS = 50 * 10**18; // 50 tokens
    uint256 public constant RECRUITMENT_INCENTIVE = 0.25 * 10**18; // 0.25 tokens
    uint256 public constant CLASS_COMPLETION_REWARD = 2 * 10**18; // 2 tokens
    uint256 public constant ENGAGEMENT_BONUS = 1 * 10**18; // 1 token
    uint256 public constant COMPLETION_ENGAGEMENT_BONUS = 3 * 10**18; // 3 tokens
    uint256 public constant FINAL_COMPLETION_PAYMENT = 50 * 10**18; // 50 tokens

    uint256 public studentsRecruited;
    uint256 public classesCompleted;
    uint256 public engagedStudents;

    bool public signingBonusPaid;
    bool public finalPaymentMade;

    event BonusPaid(address indexed producer, uint256 amount, string reason);
    event RecruitmentIncentivePaid(address indexed producer, uint256 amount);
    event ClassCompletionRewardPaid(address indexed producer, uint256 amount);
    event EngagementBonusPaid(address indexed producer, uint256 amount);
    event FinalCompletionPaid(address indexed producer, uint256 amount);

    modifier onlyProducer() {
        require(msg.sender == producer, "Only the producer can call this function");
        _;
    }

    constructor(address _tokenAddress, address _producer, address _initialOwner) Ownable(_initialOwner) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_producer != address(0), "Invalid producer address");
        token = IERC20(_tokenAddress);
        producer = _producer;
    }

    // Pay the signing bonus
    function paySigningBonus() external onlyOwner {
        require(!signingBonusPaid, "Signing bonus already paid");
        require(token.transfer(producer, SIGNING_BONUS), "Token transfer failed");
        signingBonusPaid = true;
        emit BonusPaid(producer, SIGNING_BONUS, "Signing Bonus");
    }

    // Record recruitment and pay incentive
    function recordStudentRecruitment(uint256 numberOfStudents) external onlyOwner {
        require(studentsRecruited + numberOfStudents <= 12, "Exceeds maximum student count");
        uint256 payout = numberOfStudents * RECRUITMENT_INCENTIVE;
        require(token.transfer(producer, payout), "Token transfer failed");
        studentsRecruited += numberOfStudents;
        emit RecruitmentIncentivePaid(producer, payout);
    }

    // Record a class session and pay the completion reward
    function recordClassCompletion(uint256 attendees) external onlyOwner {
        require(classesCompleted < 12, "All classes already completed");
        require(attendees >= 10, "Not enough attendees to qualify");
        uint256 payout = CLASS_COMPLETION_REWARD;
        require(token.transfer(producer, payout), "Token transfer failed");
        classesCompleted++;
        emit ClassCompletionRewardPaid(producer, payout);
    }

    // Record student engagement and pay bonus
    function recordEngagedStudents(uint256 numberOfEngagedStudents) external onlyOwner {
        require(engagedStudents + numberOfEngagedStudents <= 12, "Exceeds maximum engaged students");
        uint256 payout = numberOfEngagedStudents * ENGAGEMENT_BONUS;
        require(token.transfer(producer, payout), "Token transfer failed");
        engagedStudents += numberOfEngagedStudents;
        emit EngagementBonusPaid(producer, payout);
    }

    // Pay the completion engagement bonus
    function payCompletionEngagementBonus() external onlyOwner {
        require(engagedStudents >= 11, "Not enough engaged students for bonus");
        uint256 payout = COMPLETION_ENGAGEMENT_BONUS;
        require(token.transfer(producer, payout), "Token transfer failed");
        emit BonusPaid(producer, payout, "Completion Engagement Bonus");
    }

    // Pay the final completion payment
    function payFinalCompletion() external onlyOwner {
        require(!finalPaymentMade, "Final payment already made");
        require(classesCompleted == 12, "All classes must be completed");
        require(token.transfer(producer, FINAL_COMPLETION_PAYMENT), "Token transfer failed");
        finalPaymentMade = true;
        emit FinalCompletionPaid(producer, FINAL_COMPLETION_PAYMENT);
    }

    // Emergency withdraw (only by owner for safety)
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Token transfer failed");
    }

    function getContractBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}