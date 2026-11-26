import 'package:budgetbuddy/features/social_screens.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('only accepted non-owner members can take over a group', () {
    final group = {
      'members': [
        {'userId': 'u1', 'role': 'owner', 'invitationStatus': 'accepted'},
        {'userId': 'u2', 'role': 'member', 'invitationStatus': 'accepted'},
        {'userId': null, 'role': 'member', 'invitationStatus': 'pending'},
        {'userId': 'u4', 'role': 'viewer', 'invitationStatus': 'accepted'},
      ],
    };
    expect(FamilyScreen.transferCandidates(group).map((m) => m['userId']), [
      'u2',
      'u4',
    ]);
  });
}
